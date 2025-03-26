// Route Segment Config for ensuring the login page is always
// dynamically rendered and never cached

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store' 