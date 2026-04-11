import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const applications = await prisma.jobApplication.findMany({
      where: { userId: session.user.id },
      orderBy: { appliedDate: 'desc' },
    })

    return NextResponse.json(applications)
  } catch (error) {
    console.error('Get applications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { company, position, status, appliedDate, location, notes } = data

    if (!company || !position || !status || !appliedDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const userRow = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { currentFolderId: true },
    })

    const application = await prisma.jobApplication.create({
      data: {
        company,
        position,
        status,
        appliedDate: new Date(appliedDate),
        location: location || null,
        notes: notes || null,
        userId: session.user.id,
        currentFolderId: userRow?.currentFolderId ?? null,
      },
    })

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error('Create application error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
