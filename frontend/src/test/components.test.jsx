import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary'

describe('Components', () => {
  it('ErrorBoundary catches errors', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )
    }).not.toThrow()

    spy.mockRestore()
  })

  it('ErrorBoundary renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })
})
