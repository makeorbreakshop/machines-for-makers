# Machines for Makers

A comprehensive platform for comparing laser cutters, 3D printers, and CNC machines to help makers choose the right tools for their projects.

## About the Project

Machines for Makers is a web application designed to help makers, hobbyists, and professionals find and compare digital fabrication tools. The platform provides detailed information, specifications, and user reviews for various machines including laser cutters, 3D printers, and CNC machines.

## Features

### Current Public User Features
- **Advanced Filtering**: Filter machines by type, price range, power, speed, and special features
- **Interactive Comparison**: Select and compare multiple machines side by side
- **Search Functionality**: Quickly find machines with fuzzy search
- **Detailed Machine Pages**: View comprehensive specifications, photos, and user reviews
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Category Browsing**: Browse machines by category (laser cutters, 3D printers, CNC machines)
- **Promo Codes**: Find available promotional discounts for various machines

### Current Admin Features
- **Machine Management**: Add, edit, and delete machine listings with detailed specifications
- **Brand Management**: Manage manufacturer and brand information
- **Category Administration**: Create and modify machine categories
- **Review Moderation**: Approve, edit, or remove user-submitted reviews
- **Settings Configuration**: Manage site-wide settings and configurations
- **Secure Authentication**: Protected admin interface with secure login system

### Planned Future Enhancements
- Material compatibility charts
- Cost calculator for total ownership costs
- Size visualizer for comparing machine dimensions
- Decision helper for personalized recommendations
- Wishlist functionality
- Community resources section
- Software compatibility information
- Maker guides and tutorials
- Exportable comparison charts

## Tech Stack

- **Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS with Shadcn UI components
- **Database**: Supabase (PostgreSQL)
- **Search**: Fuse.js for fuzzy searching
- **State Management**: React Context API
- **Authentication**: Supabase Auth
- **Routing**: Next.js App Router with route groups for admin section

## Current Site Sections

### Home Page
- Featured machines carousel
- Top picks in each category
- Quick category selection

### Machine Category Pages
- Filtering options by specifications
- Sorting by key specifications
- Grid view of machines
- Specification highlights for each machine

### Machine Detail Pages
- Image gallery
- Technical specifications
- User reviews and ratings
- Similar machines suggestions

### Comparison Tool
- Side-by-side specification comparison
- Visual highlights of key differences

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
   ```
   git clone https://github.com/makeorbreakshop/machines-for-makers.git
   cd machines-for-makers
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your Supabase credentials
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Start the development server
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Project Structure

- `/app` - Next.js app router pages and API routes
  - `/(site)` - Public-facing website routes
  - `/(admin)` - Admin panel routes with authentication
  - `api` - API endpoints
- `/components` - Reusable UI components
- `/hooks` - Custom React hooks
- `/lib` - Utility functions, types, and services
- `/public` - Static assets
- `/types` - TypeScript type definitions
- `/database` - Database schemas and types

## Admin Access

The admin panel is accessible at `/admin` and requires authentication. Admin features include:

1. **Dashboard**: Overview of site statistics and recent activity
2. **Machines**: CRUD operations for machine listings and specifications
3. **Brands**: Manage manufacturer information
4. **Categories**: Organize machines by type and features
5. **Reviews**: Moderate user-submitted reviews
6. **Settings**: Configure site-wide settings

## Deployment Architecture

The application follows Next.js best practices for deployment:

- **Server Components**: Fetch data directly from Supabase for optimal performance
- **API Routes**: Use Edge runtime for public endpoints, Node.js runtime for admin functionality
- **Security**: Route group architecture with client-side authentication for admin routes
- **Caching**: Strategic use of caching for public-facing content

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Shadcn UI](https://ui.shadcn.com/) for the component library
- [Tailwind CSS](https://tailwindcss.com/) for the styling framework
- [Next.js](https://nextjs.org/) for the React framework
- [Supabase](https://supabase.io/) for the database and authentication

## Performance Optimization

The application has been optimized for better performance metrics:

### Caching Strategy
- Pages use appropriate caching with `dynamic = 'auto'` and revalidation periods
- Middleware sets appropriate cache headers based on content type
- Vercel configuration includes optimized caching for static assets and images

### Image Optimization
- Images use Next.js Image component with proper size attributes
- Quality parameters set to balance image quality and performance
- Responsive sizing with appropriate `sizes` attribute for different viewports

### JavaScript Optimization
- Components are broken down into smaller, manageable pieces
- React.memo is used for pure components to prevent unnecessary re-renders
- useCallback and useMemo are used for expensive calculations and event handlers
- Debounced functions for search and filter operations to reduce API calls

### CSS Optimization
- Tailwind configuration properly purges unused styles
- The content configuration includes all used files
- Experimental optimizations enabled for better CSS output

To run a performance audit yourself:
1. Build the application: `npm run build`
2. Start the production server: `npm start`
3. Run Lighthouse from Chrome DevTools on the deployed application