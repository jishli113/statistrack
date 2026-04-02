import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Set the signed-in user's current folder (for new apps / Gmail consumer). */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const folderId =
      body.folderId === null || body.folderId === undefined
        ? null
        : String(body.folderId)

    if (folderId) {
      const folder = await prisma.jobApplicationFolder.findFirst({
        where: { id: folderId, userId: session.user.id },
      })
      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { currentFolderId: folderId },
      select: {
        currentFolderId: true,
        currentFolder: { select: { id: true, folderName: true } },
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Set current folder error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
