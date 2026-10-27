import { useEffect, useState } from 'react';
import api from '../services/api';

export default function useJobCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.get('/metadata/categories', { signal: controller.signal })
      .then(({ data }) => {
        if (!data?.success || !Array.isArray(data.data)) throw new Error('Invalid categories');
        setCategories(data.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Chưa tải được danh mục nghề nghiệp. Vui lòng tải lại trang.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return { categories, loading, error };
}
