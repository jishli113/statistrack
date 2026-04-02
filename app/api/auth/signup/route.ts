import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email: rawEmail, password } = body
    const setCurrentFolder =
      body.setCurrentFolder === undefined ? true : body.setCurrentFolder === true

    if (!rawEmail || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const email = normalizeEmail(String(rawEmail))

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const defaultFolderName = `${email}'s Folder`

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          gmailLastSynced: new Date(),
        },
      })

      const defaultFolder = await tx.jobApplicationFolder.create({
        data: {
          userId: createdUser.id,
          folderName: defaultFolderName,
        },
      })

      if (setCurrentFolder) {
        await tx.user.update({
          where: { id: createdUser.id },
          data: { currentFolderId: defaultFolder.id },
        })
      }

      return createdUser
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
