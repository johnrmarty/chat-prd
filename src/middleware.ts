// src/middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next/image|_next/static|favicon.ico|sign-in/\\[\\[\\.\\.\\.sign-in\\]\\]|sign-up/\\[\\[\\.\\.\\.sign-up\\]\\]).*)',
  ],
};
