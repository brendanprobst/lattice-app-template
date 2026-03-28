import jwt from 'jsonwebtoken';

const TEST_ISSUER = process.env.SUPABASE_JWT_ISSUER || 'https://test-project.supabase.co/auth/v1';
const TEST_AUDIENCE = process.env.SUPABASE_JWT_AUDIENCE || 'authenticated';

function getJwtSecret(): string {
  return process.env.SUPABASE_JWT_SECRET || 'test-jwt-secret';
}

export async function createAuthToken(userId = 'user-test', email = 'test@example.com'): Promise<string> {
  return jwt.sign({
    sub: userId,
    email,
    role: 'authenticated',
    iss: TEST_ISSUER,
    aud: TEST_AUDIENCE,
  }, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: '1h',
  });
}
