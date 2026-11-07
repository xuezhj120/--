import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ToastContainer } from '@/components/Toast'
import { NavBar } from '@/components/NavBar'
import { BottomNav } from '@/components/BottomNav'
import { SplashScreen } from '@/components/SplashScreen'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '昭院闲集 - 校园二手交易与论坛',
  description: '昭通学院校园二手交易平台与论坛，闲置物品买卖、学习生活交流，同校面交更放心',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="app-bg min-h-full flex flex-col bg-[#0b0b0d] text-[#ece9e4]">
        <SplashScreen />
        <NavBar />
        <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 pb-24 md:pb-8">
          {children}
        </main>
        <BottomNav />
        <ToastContainer />
      </body>
    </html>
  )
}