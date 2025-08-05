import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/database';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  organizationName: z.string().min(1),
  organizationDomain: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Check if organization already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { domain: validatedData.organizationDomain },
    });

    if (existingOrg) {
      res.status(400).json({ error: 'Organization domain already exists' });
      return;
    }

    // Check if company already exists
    const existingCompany = await prisma.company.findUnique({
      where: { domain: validatedData.organizationDomain },
    });

    if (existingCompany && existingCompany.organizationId) {
      res.status(400).json({ 
        error: 'Company already registered',
        message: 'This company domain is already registered with another organization'
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Execute everything in a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: validatedData.organizationName,
          domain: validatedData.organizationDomain,
        },
      });

      let company;
      if (existingCompany && !existingCompany.organizationId) {
        // Update existing company to link it to the organization
        company = await tx.company.update({
          where: { id: existingCompany.id },
          data: {
            organizationId: organization.id,
            name: validatedData.organizationName, // Update name in case it's different
          },
        });
      } else {
        // Create new company
        company = await tx.company.create({
          data: {
            name: validatedData.organizationName,
            domain: validatedData.organizationDomain,
            organizationId: organization.id,
          },
        });
      }

      // Create user
      const user = await tx.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          organizationId: organization.id,
        },
      });

      return { organization, company, user };
    });

    const { organization, company, user } = result;

    const token = jwt.sign(
      {
        userId: user.id,
        organizationId: organization.id,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Set JWT token in HttpOnly cookie
    res.cookie('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        organization: {
          id: organization.id,
          name: organization.name,
          domain: organization.domain,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.issues });
      return;
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      include: { organization: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      user.password
    );

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        organizationId: user.organizationId,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Set JWT token in HttpOnly cookie
    res.cookie('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          domain: user.organization.domain,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.issues });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req: Request, res: Response): void => {
  res.clearCookie('auth-token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.json({ message: 'Logged out successfully' });
});

export default router;
