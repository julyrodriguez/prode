'use client';

import { useParams } from 'next/navigation';
import UserPredictionsView from '../../../../views/UserPredictionsView';

export default function Page() {
  const params = useParams<any>();
  const userId = params?.userId || params?.userid;
  return <UserPredictionsView userId={userId} />;
}
