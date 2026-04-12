import { useEffect, useState } from 'react'
import { isChatSection } from '../lib/chatUtils'
import type { SidebarView } from '../components/layout/Sidebar'

export type MobilePane = 'sidebar' | 'list' | 'detail'

export function useLayout(activeView: SidebarView) {
	const [viewportWidth, setViewportWidth] = useState(() =>
		typeof window === 'undefined' ? 1280 : window.innerWidth,
	)
	const [mobilePaneState, setMobilePane] = useState<MobilePane>('detail')
	const [isSidebarDrawerOpenState, setIsSidebarDrawerOpen] = useState(false)
	const [isDesktopSidebarCollapsedState, setIsDesktopSidebarCollapsed] = useState(false)

	const isMobile = viewportWidth < 768
	const isTablet = viewportWidth >= 768 && viewportWidth < 1024
	const isDesktop = viewportWidth >= 1024

	useEffect(() => {
		const handleResize = () => setViewportWidth(window.innerWidth)
		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	return {
		isMobile,
		isTablet,
		isDesktop,
		mobilePane: isMobile && isChatSection(activeView) ? mobilePaneState : 'detail',
		setMobilePane,
		isSidebarDrawerOpen: isDesktop ? false : isSidebarDrawerOpenState,
		setIsSidebarDrawerOpen,
		isDesktopSidebarCollapsed: isDesktop ? isDesktopSidebarCollapsedState : false,
		setIsDesktopSidebarCollapsed,
	}
}
