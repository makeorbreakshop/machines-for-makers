import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1" itemScope itemType="https://schema.org/BreadcrumbList">
        <li className="flex items-center" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <Link href="/" className="flex items-center hover:text-primary" itemProp="item">
            <Home className="h-4 w-4 mr-1" />
            <span className="sr-only" itemProp="name">
              Home
            </span>
          </Link>
          <meta itemProp="position" content="1" />
        </li>
        <li>
          <ChevronRight className="h-4 w-4" />
        </li>

        {items.map((item, index) => (
          <li
            key={item.href}
            className="flex items-center"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            <Link
              href={item.href}
              className={`hover:text-primary ${index === items.length - 1 ? "font-medium text-foreground" : ""}`}
              itemProp="item"
            >
              <span itemProp="name">{item.label}</span>
            </Link>
            <meta itemProp="position" content={`${index + 2}`} />
            {index < items.length - 1 && (
              <>
                <ChevronRight className="h-4 w-4 mx-1" />
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

