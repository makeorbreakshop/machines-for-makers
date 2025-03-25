# Machines for Makers

A comprehensive platform for comparing laser cutters, 3D printers, and CNC machines to help makers choose the right tools for their projects.

## About the Project

Machines for Makers is a web application designed to help makers, hobbyists, and professionals find and compare digital fabrication tools. The platform provides detailed information, specifications, and user reviews for various machines including laser cutters, 3D printers, and CNC machines.

## Features

- **Advanced Filtering**: Filter machines by type, price range, power, speed, and special features
- **Interactive Comparison**: Select and compare multiple machines side by side
- **Search Functionality**: Quickly find machines with fuzzy search
- **Detailed Machine Pages**: View comprehensive specifications, photos, and user reviews
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS with Shadcn UI components
- **Database**: Supabase (PostgreSQL)
- **Search**: Fuse.js for fuzzy searching
- **State Management**: React Context API
- **Authentication**: Supabase Auth

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
- `/components` - Reusable UI components
- `/hooks` - Custom React hooks
- `/lib` - Utility functions, types, and services
- `/public` - Static assets

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