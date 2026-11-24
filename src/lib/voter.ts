"use client"

/** Anonymous per-browser id for one-vote-per-voter. Replaced by the chat account id once sign-in exists. */
export function voterId() {
  try {
    let id = localStorage.getItem("ts-voter")
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem("ts-voter", id)
    }
    return id
  } catch {
    return (window as unknown as { __tsVoter?: string }).__tsVoter ??= crypto.randomUUID()
  }
}
