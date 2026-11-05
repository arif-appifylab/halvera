import { createContext, useContext, useMemo, useState } from 'react'

// Who is looking at the site. In EzyCourse this comes from the session; here the
// preview bar switches it so every state of the theme can be checked.
//   name, email: the signed-in student
//   role:       'visitor' (signed out) | 'student' (signed in, no membership) | 'member' (on a membership plan)
//   siteAccess: 'none' | 'active' | 'ended'   (the access gate; see src/lib/access.js)
//   verified:   false while the student hasn't confirmed their email

const PRESETS = {
  visitor: { role: 'visitor', name: '', email: '', siteAccess: 'none', verified: true, plan: null },
  student: { role: 'student', name: 'Adnan Rahman', email: 'adnan@example.com', siteAccess: 'active', verified: true, plan: null },
  member: { role: 'member', name: 'Adnan Rahman', email: 'adnan@example.com', siteAccess: 'active', verified: true, plan: 'supported' },
}

const ViewerContext = createContext(null)

const read = () => {
  // Preview only (/palettes iframes): ?as=student|member shows that viewer without saving it.
  const as = new URLSearchParams(window.location.search).get('as')
  if (PRESETS[as]) return PRESETS[as]
  try {
    const saved = JSON.parse(localStorage.getItem('halvera-viewer'))
    if (saved && PRESETS[saved.role]) return { ...PRESETS[saved.role], ...saved }
  } catch { /* storage unavailable */ }
  return PRESETS.visitor
}

export function ViewerProvider({ children }) {
  const [viewer, setState] = useState(read)
  const value = useMemo(() => {
    const save = (next) => {
      setState(next)
      try { localStorage.setItem('halvera-viewer', JSON.stringify(next)) } catch { /* storage unavailable */ }
    }
    return {
      viewer,
      signedIn: viewer.role !== 'visitor',
      setRole: (role) => save({ ...PRESETS[role], siteAccess: role === 'visitor' ? 'none' : viewer.siteAccess === 'none' ? 'active' : viewer.siteAccess }),
      update: (patch) => save({ ...viewer, ...patch }),
      signIn: () => save({ ...PRESETS.student }),
      signOut: () => save({ ...PRESETS.visitor }),
    }
  }, [viewer])
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useViewer = () => useContext(ViewerContext)
