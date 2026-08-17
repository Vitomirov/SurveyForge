/**
 * Password hashing and verification.
 * Wraps bcrypt for storing and checking user passwords at a fixed cost factor.
 */
import bcrypt from 'bcrypt'

const ROUNDS = 10

export async function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS)
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}
