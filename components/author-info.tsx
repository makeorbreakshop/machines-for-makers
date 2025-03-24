import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarDays } from "lucide-react"

interface AuthorInfoProps {
  name: string
  image?: string
  role: string
  publishDate: string
  updateDate?: string
}

export default function AuthorInfo({ name, image, role, publishDate, updateDate }: AuthorInfoProps) {
  return (
    <div className="flex items-center space-x-4 border-t border-b py-4 my-6">
      <Avatar className="h-12 w-12">
        {image && <AvatarImage src={image} alt={name} />}
        <AvatarFallback>
          {name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </AvatarFallback>
      </Avatar>
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-sm text-muted-foreground">{role}</div>
        <div className="flex items-center text-xs text-muted-foreground mt-1">
          <CalendarDays className="h-3 w-3 mr-1" />
          <span>Published: {new Date(publishDate).toLocaleDateString()}</span>
          {updateDate && <span className="ml-2">(Updated: {new Date(updateDate).toLocaleDateString()})</span>}
        </div>
      </div>
    </div>
  )
}

