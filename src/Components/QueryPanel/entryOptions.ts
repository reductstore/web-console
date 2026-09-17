/** Trims, removes empty and duplicate entry names, then sorts them. */
export const normalizeEntrySelection = (entries: string[]): string[] =>
  Array.from(
    new Set(entries.map((entry) => entry.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

interface EntryOption {
  label: string;
  value: string;
}

interface EntryOptionGroup {
  label: string;
  options: EntryOption[];
}

/** Groups literal leaves and recursive wildcards by top-level entry. */
export const buildEntryOptions = (entries: string[]) => {
  const allEntryNames = normalizeEntrySelection(entries);
  const childCount = new Map<string, number>();
  const nonLeafSet = new Set<string>();
  for (const entry of allEntryNames) {
    const slashIdx = entry.lastIndexOf("/");
    if (slashIdx !== -1) {
      // Mark all ancestor segments as non-leaf
      let path = entry.substring(0, slashIdx);
      while (path) {
        nonLeafSet.add(path);
        const idx = path.lastIndexOf("/");
        path = idx !== -1 ? path.substring(0, idx) : "";
      }
      // Count direct children
      const parent = entry.substring(0, slashIdx);
      childCount.set(parent, (childCount.get(parent) ?? 0) + 1);
    }
  }

  const seen = new Set<string>();
  const options: EntryOption[] = [];
  for (const entry of allEntryNames) {
    if (nonLeafSet.has(entry) && (childCount.get(entry) ?? 0) > 1) {
      // Non-leaf with multiple children: show recursive wildcard instead
      const wildcard = `${entry}/**`;
      if (!seen.has(wildcard)) {
        seen.add(wildcard);
        options.push({ label: wildcard, value: wildcard });
      }
    } else if (!nonLeafSet.has(entry)) {
      // Leaf: show as-is
      if (!seen.has(entry)) {
        seen.add(entry);
        options.push({ label: entry, value: entry });
      }
    }
    // Non-leaf with 1 child: skip (child is already listed)
  }

  const groupedOptions = new Map<string, EntryOption[]>();
  const otherOptions: EntryOption[] = [];
  for (const option of options) {
    if (option.value === "*") continue;

    const slashIdx = option.value.indexOf("/");
    if (slashIdx === -1) {
      otherOptions.push(option);
      continue;
    }

    const groupName = option.value.substring(0, slashIdx);
    const group = groupedOptions.get(groupName) ?? [];
    group.push(option);
    groupedOptions.set(groupName, group);
  }

  const groups: EntryOptionGroup[] = [
    { label: "All", options: [{ label: "*", value: "*" }] },
  ];
  for (const [label, groupOptions] of groupedOptions) {
    groups.push({ label, options: groupOptions });
  }
  if (otherOptions.length > 0) {
    groups.push({ label: "Other", options: otherOptions });
  }
  return groups;
};
