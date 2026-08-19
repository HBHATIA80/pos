import { redirect } from 'next/navigation'

export default function CategoriesPage() {
  redirect('/dashboard/products?tab=categories')
}
