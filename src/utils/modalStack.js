const stack = []

export function pushModal(id) {
  removeModal(id)
  stack.push(id)
}

export function removeModal(id) {
  const idx = stack.indexOf(id)
  if (idx !== -1) stack.splice(idx, 1)
}

export function isTopModal(id) {
  return stack.length > 0 && stack[stack.length - 1] === id
}
