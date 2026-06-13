'use client';

import { use } from 'react';
import UserPredictionsView from '../../../../views/UserPredictionsView';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default function Page({ params }: PageProps) {
  const resolvedParams = use(params);
  return <UserPredictionsView userId={resolvedParams?.userId} />;
}
