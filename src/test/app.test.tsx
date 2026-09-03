import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { db } from '../lib/db'

async function resetDb() {
  await db.records.clear()
}

describe('Kumbuka app', () => {
  beforeEach(async () => {
    cleanup()
    await resetDb()
  })

  it('renders the shell without crashing', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getAllByText(/Kumbuka/i).length).toBeGreaterThan(0)
  })

  it('lets a user type an entry, review it, and save it', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    // Switch to text mode (voice isn't supported in jsdom, so it's already default text mode)
    const textarea = await screen.findByPlaceholderText(/uliza kuhusu|ask about/i)
    fireEvent.change(textarea, { target: { value: 'Nimempa John 5000 kwa diesel' } })

    const saveButtons = screen.getAllByText(/save|hifadhi/i)
    fireEvent.click(saveButtons[saveButtons.length - 1])

    // Review sheet should appear with parsed values
    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeTruthy()
    })
    expect(screen.getByDisplayValue('5000')).toBeTruthy()

    const confirmButtons = screen.getAllByText(/confirm|thibitisha/i)
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(async () => {
      const all = await db.records.toArray()
      expect(all.length).toBe(1)
      expect(all[0].person).toBe('John')
      expect(all[0].amount).toBe(5000)
      expect(all[0].type).toBe('expense')
    })
  })

  it('shows saved records on the records page', async () => {
    await db.records.put({
      id: 'test-1',
      title: 'Diesel paid to John — TSh 5,000',
      type: 'expense',
      person: 'John',
      amount: 5000,
      item: 'diesel',
      originalText: 'Nimempa John 5000 kwa diesel',
      lang: 'sw',
      source: 'text',
      confirmed: true,
      createdAt: Date.now(),
    })

    render(
      <MemoryRouter initialEntries={['/records']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('John')).toBeTruthy()
    })
  })
})
