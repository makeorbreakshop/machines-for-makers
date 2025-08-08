"use client"

import { format, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Signup {
  id: string
  email: string
  source: string | null
  tags: string[] | null
  created_at: string
  status: string | null
}

interface RecentSignupsTableProps {
  signups: Signup[]
}

const SOURCE_LABELS = {
  'deals-page': 'Deal Alerts',
  'material-library': 'Material Library',
  'settings-library': 'Settings Library',
}

export function RecentSignupsTable({ signups }: RecentSignupsTableProps) {
  if (signups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No signups yet. Your first subscribers will appear here!
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {signups.map((signup) => (
          <TableRow key={signup.id}>
            <TableCell className="font-medium">{signup.email}</TableCell>
            <TableCell>
              <Badge variant="outline">
                {SOURCE_LABELS[signup.source as keyof typeof SOURCE_LABELS] || signup.source || 'Unknown'}
              </Badge>
            </TableCell>
            <TableCell>
              {signup.tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="mr-1">
                  {tag}
                </Badge>
              )) || '-'}
            </TableCell>
            <TableCell>{format(parseISO(signup.created_at), 'MMM d, yyyy h:mm a')}</TableCell>
            <TableCell>
              <Badge variant={signup.status === 'active' ? 'default' : 'secondary'}>
                {signup.status || 'active'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}