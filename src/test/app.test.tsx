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

    // Review sheet should appear, pre-filled with the text verbatim so the
    // user can confirm or correct it directly — no separate person/amount
    // fields to check. (The underlying text-entry box still holds the same
    // value too, so there are two matches — the sheet's is the last one.)
    await waitFor(() => {
      const matches = screen.getAllByDisplayValue('Nimempa John 5000 kwa diesel')
      expect(matches.length).toBeGreaterThan(0)
    })

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

  it('lets the user correct the recognized text in the review sheet before saving', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    const textarea = await screen.findByPlaceholderText(/uliza kuhusu|ask about/i)
    fireEvent.change(textarea, { target: { value: 'Nimempa John 5000 kwa diesel' } })

    const saveButtons = screen.getAllByText(/save|hifadhi/i)
    fireEvent.click(saveButtons[saveButtons.length - 1])

    const matches = await waitFor(() => {
      const found = screen.getAllByDisplayValue('Nimempa John 5000 kwa diesel')
      expect(found.length).toBeGreaterThan(0)
      return found
    })
    // The review sheet's textarea is the last matching element in the DOM.
    const reviewBox = matches[matches.length - 1]
    // The agent misheard the amount/person — the user corrects it directly
    // in the review box instead of separate fields.
    fireEvent.change(reviewBox, { target: { value: 'Nimempa Peter 8000 kwa mafuta' } })

    const confirmButtons = screen.getAllByText(/confirm|thibitisha/i)
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(async () => {
      const all = await db.records.toArray()
      expect(all.length).toBe(1)
      expect(all[0].person).toBe('Peter')
      expect(all[0].amount).toBe(8000)
      expect(all[0].originalText).toBe('Nimempa Peter 8000 kwa mafuta')
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
