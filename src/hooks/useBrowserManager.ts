'use client'

import { useState, useCallback, useRef } from 'react'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi'

export interface BrowserInstance {
  id: string
  url: string
  webview: WebviewWindow
  x: number
  y: number
  width: number
  height: number
  createdAt: number
}

export const useBrowserManager = () => {
  const [browsers, setBrowsers] = useState<BrowserInstance[]>([])
  const [nextBrowserId, setNextBrowserId] = useState(1)
  const mainWebview = useRef<WebviewWindow | null>(null)

  const getMainWebview = useCallback(async () => {
    if (!mainWebview.current) {
      mainWebview.current = getCurrentWebviewWindow()
    }
    return mainWebview.current
  }, [])

  const createBrowser = useCallback(async (
    url: string,
    options?: {
      x?: number
      y?: number
      width?: number
      height?: number
    }
  ) => {
    const id = `browser-${nextBrowserId}`
    const main = await getMainWebview()
    
    // Get main window position to offset browser windows
    const mainPos = await main.innerPosition()
    const baseX = mainPos.x + (options?.x || 100)
    const baseY = mainPos.y + (options?.y || 100)
    
    const browserWidth = options?.width || 800
    const browserHeight = options?.height || 600

    try {
      const webview = new WebviewWindow(id, {
        url,
        width: browserWidth,
        height: browserHeight,
        x: baseX,
        y: baseY,
        decorations: true, // Show window decorations for standalone browser windows
        transparent: false,
        resizable: true,
        skipTaskbar: false, // Show in taskbar for standalone browsers
        alwaysOnTop: false,
        minimizable: true,
        maximizable: true,
        closable: true,
        title: `Browser - ${url}`,
        focus: true
      })

      const browserInstance: BrowserInstance = {
        id,
        url,
        webview,
        x: baseX,
        y: baseY,
        width: browserWidth,
        height: browserHeight,
        createdAt: Date.now()
      }

      // Listen for close events
      webview.once('tauri://close-requested', () => {
        setBrowsers(prev => prev.filter(b => b.id !== id))
      })

      webview.once('tauri://created', () => {
        console.log(`Browser ${id} created successfully`)
      })

      webview.once('tauri://error', (error) => {
        console.error(`Browser ${id} error:`, error)
        setBrowsers(prev => prev.filter(b => b.id !== id))
      })

      setBrowsers(prev => [...prev, browserInstance])
      setNextBrowserId(prev => prev + 1)

      return browserInstance
    } catch (error) {
      console.error('Failed to create browser:', error)
      throw error
    }
  }, [nextBrowserId, getMainWebview])

  const closeBrowser = useCallback(async (id: string) => {
    const browser = browsers.find(b => b.id === id)
    if (browser) {
      try {
        await browser.webview.close()
        setBrowsers(prev => prev.filter(b => b.id !== id))
      } catch (error) {
        console.error(`Failed to close browser ${id}:`, error)
      }
    }
  }, [browsers])

  const closeAllBrowsers = useCallback(async () => {
    const closePromises = browsers.map(browser => 
      browser.webview.close().catch(error => 
        console.error(`Failed to close browser ${browser.id}:`, error)
      )
    )
    
    await Promise.allSettled(closePromises)
    setBrowsers([])
  }, [browsers])

  const focusBrowser = useCallback(async (id: string) => {
    const browser = browsers.find(b => b.id === id)
    if (browser) {
      try {
        await browser.webview.setFocus()
        await browser.webview.show()
      } catch (error) {
        console.error(`Failed to focus browser ${id}:`, error)
      }
    }
  }, [browsers])

  const resizeBrowser = useCallback(async (id: string, width: number, height: number) => {
    const browser = browsers.find(b => b.id === id)
    if (browser) {
      try {
        await browser.webview.setSize(new LogicalSize(width, height))
        setBrowsers(prev => prev.map(b => 
          b.id === id ? { ...b, width, height } : b
        ))
      } catch (error) {
        console.error(`Failed to resize browser ${id}:`, error)
      }
    }
  }, [browsers])

  const moveBrowser = useCallback(async (id: string, x: number, y: number) => {
    const browser = browsers.find(b => b.id === id)
    if (browser) {
      try {
        await browser.webview.setPosition(new LogicalPosition(x, y))
        setBrowsers(prev => prev.map(b => 
          b.id === id ? { ...b, x, y } : b
        ))
      } catch (error) {
        console.error(`Failed to move browser ${id}:`, error)
      }
    }
  }, [browsers])

  const navigateBrowser = useCallback(async (id: string, url: string) => {
    const browser = browsers.find(b => b.id === id)
    if (browser) {
      try {
        // Tauri v2 doesn't have direct navigation API
        // We need to recreate the webview with new URL
        await browser.webview.close()
        
        const newBrowser = await createBrowser(url, {
          x: browser.x,
          y: browser.y,
          width: browser.width,
          height: browser.height
        })
        
        return newBrowser
      } catch (error) {
        console.error(`Failed to navigate browser ${id}:`, error)
        throw error
      }
    }
  }, [browsers, createBrowser])

  return {
    browsers,
    createBrowser,
    closeBrowser,
    closeAllBrowsers,
    focusBrowser,
    resizeBrowser,
    moveBrowser,
    navigateBrowser
  }
}
