import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7645/ingest/0076e394-aa9d-4240-963d-3a0498b811e5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'22dd7a'},body:JSON.stringify({sessionId:'22dd7a',location:'app/api/auth/signup/route.ts:6',message:'Signup route entry',data:{hasDatabaseUrl:!!process.env.DATABASE_URL,urlPrefix:process.env.DATABASE_URL?.substring(0,30)||'undefined'},timestamp:Date.now(),runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    // #region agent log
    fetch('http://127.0.0.1:7645/ingest/0076e394-aa9d-4240-963d-3a0498b811e5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'22dd7a'},body:JSON.stringify({sessionId:'22dd7a',location:'app/api/auth/signup/route.ts:20',message:'Before Prisma findUnique',data:{hasDatabaseUrl:!!process.env.DATABASE_URL},timestamp:Date.now(),runId:'initial',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    let existingUser;
    try {
      console.log("finding user")
      existingUser = await prisma.user.findUnique({
        where: { email },
      })
    } catch (dbError: any) {
      // #region agent log
      fetch('http://127.0.0.1:7645/ingest/0076e394-aa9d-4240-963d-3a0498b811e5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'22dd7a'},body:JSON.stringify({sessionId:'22dd7a',location:'app/api/auth/signup/route.ts:23',message:'Prisma query error',data:{error:dbError?.message||'unknown',errorCode:dbError?.code||'unknown',errorName:dbError?.name||'unknown'},timestamp:Date.now(),runId:'initial',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      throw dbError;
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    })

    return NextResponse.json(
      { message: 'User created successfully', userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
