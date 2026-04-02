import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Never cache folder lists; they are per-user. */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const folders = await prisma.jobApplicationFolder.findMany({
      where: { userId },
      select: { id: true, folderName: true, userId: true },
      orderBy: { folderName: 'asc' },
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentFolderId: true },
    })

    let currentFolderId = user?.currentFolderId ?? null
    let currentFolder: { id: string; folderName: string } | null = null

    // currentFolderId can point at any row; clear if it does not belong to this user.
    if (currentFolderId) {
      const owned = folders.find((f) => f.id === currentFolderId)
      if (owned) {
        currentFolder = { id: owned.id, folderName: owned.folderName }
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { currentFolderId: null },
        })
        currentFolderId = null
      }
    }

    if (!currentFolderId && folders.length > 0) {
      currentFolderId = folders[0].id
      currentFolder = {
        id: folders[0].id,
        folderName: folders[0].folderName,
      }

      await prisma.user.update({
        where: { id: userId },
        data: { currentFolderId },
      })
    }

    return NextResponse.json({
      folders,
      currentFolderId,
      currentFolder,
    })
  } catch (error) {
    console.error('Get folders error:', error)
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
    const jsn = await request.json()
    const setCurrentFolder = jsn.setCurrentFolder ?? false
    const folderName =
      typeof jsn.folderName === 'string' ? jsn.folderName.trim() : ''
    if (!folderName) {
      return NextResponse.json({ error: 'folderName is required' }, { status: 400 })
    }
    const userId = session.user.id
    try {
      const folder = await prisma.jobApplicationFolder.create({
        data: {
          folderName,
          userId,
        },
        select: { id: true, folderName: true, userId: true },
      })
      if (setCurrentFolder) {
        await prisma.user.update({
          where: { id: userId },
          data: { currentFolderId: folder.id },
        })
      }
      return NextResponse.json(folder, { status: 201 })
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
    console.error('Create folder error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
