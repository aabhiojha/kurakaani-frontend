import { useEffect, useState } from 'react'
import { isChatSection } from '../lib/chatUtils'
import type { SidebarView } from '../components/layout/Sidebar'

export type MobilePane = 'sidebar' | 'list' | 'detail'

export function useLayout(activeView: SidebarView) {
	const [viewportWidth, setViewportWidth] = useState(() =>
		typeof window === 'undefined' ? 1280 : window.innerWidth,
	)
	const [mobilePane, setMobilePane] = useState<MobilePane>('detail')
	const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false)
	const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false)

	const isMobile = viewportWidth < 768
	const isTablet = viewportWidth >= 768 && viewportWidth < 1024
	const isDesktop = viewportWidth >= 1024

	useEffect(() => {
		const handleResize = () => setViewportWidth(window.innerWidth)
		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	useEffect(() => {
		if (!isMobile) setMobilePane('detail')
		if (isDesktop) setIsSidebarDrawerOpen(false)
		if (!isDesktop) setIsDesktopSidebarCollapsed(false)
	}, [isDesktop, isMobile])

	useEffect(() => {
		if (!isChatSection(activeView) && isMobile) setMobilePane('detail')
	}, [activeView, isMobile])

	return {
		isMobile,
		isTablet,
		isDesktop,
		mobilePane,
		setMobilePane,
		isSidebarDrawerOpen,
		setIsSidebarDrawerOpen,
		isDesktopSidebarCollapsed,
		setIsDesktopSidebarCollapsed,
	}
}
