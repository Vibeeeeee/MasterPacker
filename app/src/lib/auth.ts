import { prisma } from './prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

// Session management
const SESSION_TOKEN_NAME = 'sessionToken';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateSessionToken(): Promise<string> {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(userId: string): Promise<string> {
  const token = await generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  
  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
  
  return token;
}

export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_TOKEN_NAME)?.value;
  
  if (!token) return null;
  
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  
  if (!session || session.expiresAt < new Date()) {
    return null;
  }
  
  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (!user.isAdmin) {
    redirect('/');
  }
  return user;
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  });
}

export async function logout() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_TOKEN_NAME)?.value;
  
  if (token) {
    await deleteSession(token);
    cookieStore.delete(SESSION_TOKEN_NAME);
  }
  
  redirect('/login');
}

export async function getAppConfig() {
  return prisma.appConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      autoSnapshotInterval: 24,
      maxSnapshots: 30,
      readOnlyMode: false,
      theme: 'system',
    },
    update: {},
  });
}
