import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { fullName } = await request.json()

    if (!fullName || fullName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Nama harus minimal 2 karakter' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      )
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', user.id)

    if (updateError) {
      console.error('Update name error:', updateError)
      return NextResponse.json(
        { error: 'Gagal menyimpan nama' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Nama berhasil disimpan',
    })
  } catch (error) {
    console.error('Update name error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
