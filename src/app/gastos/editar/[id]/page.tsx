'use client';

import { useParams } from 'next/navigation';
import ExpenseForm from '@/app/components/ExpenseForm';

export default function EditarGasto() {
  const { id } = useParams<{ id: string }>();
  return <ExpenseForm expenseId={id} />;
}
