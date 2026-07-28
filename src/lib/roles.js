export function roleHome(role) {
  if (role === 'specialist') return '/specialist'
  if (role === 'qa') return '/qa'
  return '/'
}
