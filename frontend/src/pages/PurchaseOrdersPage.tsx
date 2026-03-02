import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Title, Button, Group, Modal, Table, Badge, ActionIcon, Stack, Paper, Text,
  TextInput, Textarea, Select, NumberInput, Loader, Card, SimpleGrid, Menu,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconDotsVertical, IconEdit, IconEye } from '@tabler/icons-react';
import { purchaseOrdersApi } from '../api/purchaseOrders';
import { productsApi } from '../api/products';
import { formatCurrency, formatDateTime, STATUS_COLORS } from '../utils/format';
import type { PurchaseOrder, OrderItem } from '../types';

interface ItemForm { product: string; quantity: number | string; unit_cost: number | string }

export function PurchaseOrdersPage() {
  const qc = useQueryClient();
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);
  const [editOrder, setEditOrder] = useState<PurchaseOrder | null>(null);

  // Form state
  const [reference, setReference] = useState('');
  const [supplier, setSupplier] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemForm[]>([{ product: '', quantity: 1, unit_cost: 1 }]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => purchaseOrdersApi.list(),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  });

  const productOptions = (products?.results || []).map((p) => ({
    value: p.id, label: `${p.name} (${p.sku})`,
  }));

  const createMutation = useMutation({
    mutationFn: (o: Partial<PurchaseOrder>) => purchaseOrdersApi.create(o),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['financial-summary'] });
      closeCreate(); resetForm();
      notifications.show({ title: 'Success', message: 'Purchase order created', color: 'green' });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: JSON.stringify(err.response?.data) || 'Failed', color: 'red' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => purchaseOrdersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['financial-summary'] });
      setEditOrder(null); resetForm();
      notifications.show({ title: 'Success', message: 'Purchase order updated', color: 'green' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: purchaseOrdersApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      notifications.show({ title: 'Success', message: 'Purchase order deleted', color: 'green' });
    },
  });

  const resetForm = () => {
    setReference(''); setSupplier(''); setStatus('draft'); setNotes('');
    setItems([{ product: '', quantity: 1, unit_cost: 1 }]);
  };

  const openEditModal = (po: PurchaseOrder) => {
    setEditOrder(po);
    setReference(po.reference); setSupplier(po.supplier); setStatus(po.status); setNotes(po.notes);
    setItems(po.items.map((i) => ({
      product: i.product, quantity: parseFloat(i.quantity), unit_cost: parseFloat(i.unit_cost || '0'),
    })));
  };

  const addItem = () => setItems([...items, { product: '', quantity: 1, unit_cost: 1 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (index: number, field: keyof ItemForm, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = (isEdit = false) => {
    const payload: any = {
      reference, supplier, status, notes,
      items: items.filter((i) => i.product).map((i) => ({
        product: i.product,
        quantity: String(i.quantity),
        unit_cost: String(i.unit_cost),
      })),
    };
    if (isEdit && editOrder) {
      updateMutation.mutate({ id: editOrder.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

const formFields = (
    <>
      <SimpleGrid cols={2}>
        <TextInput label="Reference" value={reference} onChange={(e) => setReference(e.currentTarget.value)} placeholder="PO-2025-001" />
        <TextInput label="Supplier" value={supplier} onChange={(e) => setSupplier(e.currentTarget.value)} />
      </SimpleGrid>
      <Select label="Status" data={[
        { value: 'draft', label: 'Draft' },
        { value: 'completed', label: 'Completed (adds stock)' },
        { value: 'cancelled', label: 'Cancelled' },
      ]} value={status} onChange={(v) => setStatus(v || 'draft')} />
      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />

      <Text fw={600} size="sm" mt="sm">Line Items</Text>
      {items.map((item, idx) => (
        <Group key={idx} align="end">
          <Select label="Product" data={productOptions} value={item.product} onChange={(v) => updateItem(idx, 'product', v || '')} searchable style={{ flex: 2 }} />
          <NumberInput label="Quantity" min={0.001} decimalScale={3} value={item.quantity} onChange={(v) => updateItem(idx, 'quantity', v)} style={{ flex: 1 }} />
          <NumberInput label="Unit Cost ($)" min={0.01} decimalScale={2} value={item.unit_cost} onChange={(v) => updateItem(idx, 'unit_cost', v)} style={{ flex: 1 }} />
          <ActionIcon color="red" variant="subtle" onClick={() => removeItem(idx)} disabled={items.length === 1}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}
      <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={addItem} w="fit-content">
        Add Item
      </Button>
    </>
  );

  if (isLoading) return <div className="flex justify-center py-20"><Loader /></div>;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Purchase Orders</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>New Purchase Order</Button>
      </Group>

      {(orders?.results || []).length === 0 ? (
        <Paper withBorder p="xl" ta="center">
          <Text c="dimmed">No purchase orders yet.</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Reference</Table.Th>
                <Table.Th>Supplier</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Items</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Total Cost</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(orders?.results || []).map((po) => (
                <Table.Tr key={po.id}>
                  <Table.Td fw={500}>{po.reference || `PO-${po.id.slice(0, 8)}`}</Table.Td>
                  <Table.Td>{po.supplier || '-'}</Table.Td>
                  <Table.Td><Badge color={STATUS_COLORS[po.status]}>{po.status}</Badge></Table.Td>
                  <Table.Td>{po.items.length} items</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>{formatCurrency(po.total_cost)}</Table.Td>
                  <Table.Td>{formatDateTime(po.created_at)}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Menu shadow="md">
                      <Menu.Target><ActionIcon variant="subtle"><IconDotsVertical size={16} /></ActionIcon></Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconEye size={14} />} onClick={() => setViewOrder(po)}>View</Menu.Item>
                        <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => openEditModal(po)}>Edit</Menu.Item>
                        <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => deleteMutation.mutate(po.id)}>Delete</Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      {/* Create Modal */}
      <Modal opened={createOpened} onClose={() => { closeCreate(); resetForm(); }} title="New Purchase Order" size="lg">
        <Stack>
          {formFields}
          <Button onClick={() => handleSubmit(false)} loading={createMutation.isPending}>
            Create Purchase Order
          </Button>
        </Stack>
      </Modal>

      {/* Edit Modal */}
      <Modal opened={!!editOrder} onClose={() => { setEditOrder(null); resetForm(); }} title="Edit Purchase Order" size="lg">
        <Stack>
          {formFields}
          <Button onClick={() => handleSubmit(true)} loading={updateMutation.isPending}>
            Save Changes
          </Button>
        </Stack>
      </Modal>

      {/* View Modal */}
      <Modal opened={!!viewOrder} onClose={() => setViewOrder(null)} title={`Purchase Order: ${viewOrder?.reference || ''}`} size="lg">
        {viewOrder && (
          <Stack>
            <SimpleGrid cols={3}>
              <div><Text size="sm" c="dimmed">Supplier</Text><Text fw={500}>{viewOrder.supplier || '-'}</Text></div>
              <div><Text size="sm" c="dimmed">Status</Text><Badge color={STATUS_COLORS[viewOrder.status]}>{viewOrder.status}</Badge></div>
              <div><Text size="sm" c="dimmed">Total Cost</Text><Text fw={700} size="lg">{formatCurrency(viewOrder.total_cost)}</Text></div>
            </SimpleGrid>
            {viewOrder.notes && <Text size="sm" c="dimmed">{viewOrder.notes}</Text>}
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Quantity</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Unit Cost</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {viewOrder.items.map((item, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>{item.product_name}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{item.quantity}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_cost || '0')}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }} fw={500}>{formatCurrency(item.total_cost || '0')}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
