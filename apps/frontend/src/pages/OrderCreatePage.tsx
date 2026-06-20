import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../shared/components';
import { OrderCreateForm } from './OrderCreateForm';

export function OrderCreatePage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sifariş yarat"
        description="Sifariş məlumatlarını doldurun və sistemi tərk etmədən yeni sifariş yaradın."
      />

      <OrderCreateForm
        submitLabel="Sifarişi yarat"
        cancelLabel="Geri"
        onCancel={() => navigate('/orders')}
        onCreated={(created) => navigate(`/orders/${created.id}`)}
      />
    </div>
  );
}
