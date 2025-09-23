'use client'

import { useState, useEffect, useCallback } from 'react'

interface ModalState {
  id: string
  isOpen: boolean
  zIndex: number
}

export const useModalManager = () => {
  const [modals, setModals] = useState<ModalState[]>([])

  // Base z-index for modals
  const BASE_Z_INDEX = 50

  const openModal = useCallback((id: string) => {
    setModals(prev => {
      // Check if modal is already open
      if (prev.find(modal => modal.id === id)) {
        return prev
      }

      // Calculate z-index based on number of open modals
      const zIndex = BASE_Z_INDEX + prev.length * 10

      const newModal: ModalState = {
        id,
        isOpen: true,
        zIndex
      }

      const newModals = [...prev, newModal]

      // Lock body scroll when first modal opens
      if (newModals.length === 1) {
        document.body.style.overflow = 'hidden'
        document.body.style.paddingRight = getScrollbarWidth() + 'px'
      }

      return newModals
    })
  }, [])

  const closeModal = useCallback((id: string) => {
    setModals(prev => {
      const newModals = prev.filter(modal => modal.id !== id)

      // Unlock body scroll when last modal closes
      if (newModals.length === 0) {
        document.body.style.overflow = 'unset'
        document.body.style.paddingRight = '0px'
      }

      return newModals
    })
  }, [])

  const closeAllModals = useCallback(() => {
    setModals([])
    document.body.style.overflow = 'unset'
    document.body.style.paddingRight = '0px'
  }, [])

  const getModalState = useCallback((id: string) => {
    return modals.find(modal => modal.id === id) || { id, isOpen: false, zIndex: BASE_Z_INDEX }
  }, [modals])

  const isModalOpen = useCallback((id: string) => {
    return modals.some(modal => modal.id === id && modal.isOpen)
  }, [modals])

  const getTopModalId = useCallback(() => {
    if (modals.length === 0) return null
    return modals[modals.length - 1].id
  }, [modals])

  // Handle ESC key to close top modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const topModalId = getTopModalId()
        if (topModalId) {
          closeModal(topModalId)
        }
      }
    }

    if (modals.length > 0) {
      document.addEventListener('keydown', handleEscKey)
      return () => document.removeEventListener('keydown', handleEscKey)
    }
  }, [modals, closeModal, getTopModalId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset'
      document.body.style.paddingRight = '0px'
    }
  }, [])

  return {
    openModal,
    closeModal,
    closeAllModals,
    getModalState,
    isModalOpen,
    getTopModalId,
    openModalsCount: modals.length
  }
}

// Utility function to get scrollbar width
function getScrollbarWidth(): number {
  if (typeof window === 'undefined') return 0

  const outer = document.createElement('div')
  outer.style.visibility = 'hidden'
  outer.style.overflow = 'scroll'
  outer.style.msOverflowStyle = 'scrollbar'
  document.body.appendChild(outer)

  const inner = document.createElement('div')
  outer.appendChild(inner)

  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth
  outer.parentNode?.removeChild(outer)

  return scrollbarWidth
}

// Hook for individual modal components
export const useModal = (id: string) => {
  const { openModal, closeModal, getModalState, isModalOpen } = useModalManager()

  const modalState = getModalState(id)

  return {
    isOpen: isModalOpen(id),
    zIndex: modalState.zIndex,
    open: () => openModal(id),
    close: () => closeModal(id)
  }
}

// Z-index constants for different UI elements
export const Z_INDEX = {
  DROPDOWN: 40,
  MODAL_BACKDROP: 50,
  MODAL: 51,
  TOAST: 60,
  TOOLTIP: 70,
  LOADING_OVERLAY: 80
} as const
