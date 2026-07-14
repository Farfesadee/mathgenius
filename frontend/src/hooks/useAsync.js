import { useState, useCallback } from 'react'

export const useAsync = (asyncFn, immediate = true) => {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(
    async (...args) => {
      setState({ data: null, loading: true, error: null })
      try {
        const response = await asyncFn(...args)
        setState({ data: response, loading: false, error: null })
        return response
      } catch (error) {
        const errorMessage = error?.detail || error?.message || 'Unknown error'
        setState({ data: null, loading: false, error: errorMessage })
        throw error
      }
    },
    [asyncFn]
  )

  return { ...state, execute }
}

export const useFetch = (url, options = {}) => {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  })

  const fetch = useCallback(async () => {
    setState({ data: null, loading: true, error: null })
    try {
      const response = await fetch(url, options)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      setState({ data: null, loading: false, error: error.message })
      throw error
    }
  }, [url, options])

  return { ...state, fetch }
}
