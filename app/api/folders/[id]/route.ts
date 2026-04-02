import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const userId = session.user.id
    const body = await request.json()
    const folderName =
      typeof body.folderName === 'string' ? body.folderName.trim() : ''

    if (!folderName) {
      return NextResponse.json(
        { error: 'folderName is required' },
        { status: 400 }
      )
    }

    try {
      const folder = await prisma.jobApplicationFolder.findFirst({
        where: { id, user: { id: userId } },
        select: { id: true },
      })
      if (!folder) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      const updated = await prisma.jobApplicationFolder.update({
        where: { id },
        data: { folderName },
        select: { id: true, folderName: true, userId: true },
      })
      return NextResponse.json(updated)
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        return NextResponse.json(
          { error: 'A folder with that name already exists' },
          { status: 409 }
        )
      }
      throw e
    }
  } catch (error) {
    console.error('Patch folder error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
