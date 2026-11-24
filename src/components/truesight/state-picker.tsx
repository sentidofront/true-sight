"use client"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { STATES, type StateInfo } from "@/lib/elections/states"
import { useLive } from "@/lib/store"

const PICKABLE = STATES.filter((s) => s.abbr !== "DC")

export function StatePicker({ onPick }: { onPick: (abbr: string) => void }) {
  const focus = useLive((s) => s.focus)
  const value = PICKABLE.find((s) => s.abbr === focus) ?? null

  return (
    <Combobox<StateInfo>
      items={PICKABLE}
      value={value}
      itemToStringLabel={(s) => s.name}
      isItemEqualToValue={(a, b) => a.abbr === b.abbr}
      onValueChange={(s) => s && onPick(s.abbr)}
    >
      <ComboboxInput placeholder="State" aria-label="Find a state" className="w-48 bg-background" />
      <ComboboxContent>
        <ComboboxEmpty>No match</ComboboxEmpty>
        <ComboboxList>
          {(s: StateInfo) => (
            <ComboboxItem key={s.abbr} value={s}>
              {s.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
