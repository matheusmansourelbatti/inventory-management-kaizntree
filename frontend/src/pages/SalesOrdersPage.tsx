import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Title, Button, Group, Modal, Table, Badge, ActionIcon, Stack, Paper, Text,
  TextInput, Textarea, Select, NumberInput, Loader, SimpleGrid, Menu,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconDotsVertical, IconEdit, IconEye } from '@tabler/icons-react';
import { salesOrdersApi } from '../api/salesOrders';
import { productsApi } from '../api/products';
import { formatCurrency, formatDateTime, STATUS_COLORS } from '../utils/format';
import type { SalesOrder } from '../types';

interface ItemForm { product: string; quantity: number | string; unit_price: number | string }

export function SalesOrdersPage() {
  const qc = useQueryClient();
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [viewOrder, setViewOrder] = useState<SalesOrder | null>(null);
  const [editOrder, setEditOrder] = useState<SalesOrder | null>(null);

  const [reference, setReference] = useState('');
  const [customer, setCustomer] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemForm[]>([{ product: '', quantity: 1, unit_price: 1 }]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['sales-orders'],
    queryFn: () => salesOrdersApi.list(),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  });

  const productOptions = (products?.results || []).map((p) => ({
    value: p.id, label: `${p.name} (${p.sku}) - Stock: ${p.current_stock}`,
  }));

  const createMutation = useMutation({
    mutationFn: (o: Partial<SalesOrder>) => salesOrdersApi.create(o),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['financial-summary'] });
      closeCreate(); resetForm();
      notifications.show({ title: 'Success', message: 'Sales order created', color: 'green' });
    },
    onError: (err: any) => {
      const detail = err.response?.data;
      const msg = typeof detail === 'object' ? (detail.non_field_errors?.[0] || detail.items?.[0] || JSON.stringify(detail)) : 'Failed';
      notifications.show({ title: 'Error', message: msg, color: 'red' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => salesOrdersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['financial-summary'] });
      setEditOrder(null); resetForm();
      notifications.show({ title: 'Success', message: 'Sales order updated', color: 'green' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: salesOrdersApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      notifications.show({ title: 'Success', message: 'Sales order deleted', color: 'green' });
    },
  });

  const resetForm = () => {
    setReference(''); setCustomer(''); setStatus('draft'); setNotes('');
    setItems([{ product: '', quantity: 1, unit_price: 1 }]);
  };

  const openEditModal = (so: SalesOrder) => {
    setEditOrder(so);
    setReference(so.reference); setCustomer(so.customer); setStatus(so.status); setNotes(so.notes);
    setItems(so.items.map((i) => ({
      product: i.product, quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price || '0'),
    })));
  };

  const addItem = () => setItems([...items, { product: '', quantity: 1, unit_price: 1 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (index: number, field: keyof ItemForm, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = (isEdit = false) => {
    const payload: any = {
      reference, customer, status, notes,
      items: items.filter((i) => i.product).map((i) => ({
        product: i.product,
        quantity: String(i.quantity),
        unit_price: String(i.unit_price),
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
        <TextInput label="Reference" value={reference} onChange={(e) => setReference(e.currentTarget.value)} placeholder="SO-2025-001" />
        <TextInput label="Customer" value={customer} onChange={(e) => setCustomer(e.currentTarget.value)} />
      </SimpleGrid>
      <Select label="Status" data={[
        { value: 'draft', label: 'Draft' },
        { value: 'completed', label: 'Completed (deducts stock)' },
        { value: 'cancelled', label: 'Cancelled' },
      ]} value={status} onChange={(v) => setStatus(v || 'draft')} />
      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />

      <Text fw={600} size="sm" mt="sm">Line Items</Text>
      {items.map((item, idx) => (
        <Group key={idx} align="end">
          <Select label="Product" data={productOptions} value={item.product} onChange={(v) => updateItem(idx, 'product', v || '')} searchable style={{ flex: 2 }} />
          <NumberInput label="Quantity" min={0.001} decimalScale={3} value={item.quantity} onChange={(v) => updateItem(idx, 'quantity', v)} style={{ flex: 1 }} />
          <NumberInput label="Unit Price ($)" min={0.01} decimalScale={2} value={item.unit_price} onChange={(v) => updateItem(idx, 'unit_price', v)} style={{ flex: 1 }} />
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
        <Title order={2}>Sales Orders</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>New Sales Order</Button>
      </Group>

      {(orders?.results || []).length === 0 ? (
        <Paper withBorder p="xl" ta="center">
          <Text c="dimmed">No sales orders yet.</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Reference</Table.Th>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Items</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Revenue</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(orders?.results || []).map((so) => (
                <Table.Tr key={so.id}>
                  <Table.Td fw={500}>{so.reference || `SO-${so.id.slice(0, 8)}`}</Table.Td>
                  <Table.Td>{so.customer || '-'}</Table.Td>
                  <Table.Td><Badge color={STATUS_COLORS[so.status]}>{so.status}</Badge></Table.Td>
                  <Table.Td>{so.items.length} items</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>{formatCurrency(so.total_revenue)}</Table.Td>
                  <Table.Td>{formatDateTime(so.created_at)}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Menu shadow="md">
                      <Menu.Target><ActionIcon variant="subtle"><IconDotsVertical size={16} /></ActionIcon></Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconEye size={14} />} onClick={() => setViewOrder(so)}>View</Menu.Item>
                        <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => openEditModal(so)}>Edit</Menu.Item>
                        <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => deleteMutation.mutate(so.id)}>Delete</Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      <Modal opened={createOpened} onClose={() => { closeCreate(); resetForm(); }} title="New Sales Order" size="lg">
        <Stack>
          {formFields}
          <Button onClick={() => handleSubmit(false)} loading={createMutation.isPending}>
            Create Sales Order
          </Button>
        </Stack>
      </Modal>

      <Modal opened={!!editOrder} onClose={() => { setEditOrder(null); resetForm(); }} title="Edit Sales Order" size="lg">
        <Stack>
          {formFields}
          <Button onClick={() => handleSubmit(true)} loading={updateMutation.isPending}>
            Save Changes
          </Button>
        </Stack>
      </Modal>

      <Modal opened={!!viewOrder} onClose={() => setViewOrder(null)} title={`Sales Order: ${viewOrder?.reference || ''}`} size="lg">
        {viewOrder && (
          <Stack>
            <SimpleGrid cols={3}>
              <div><Text size="sm" c="dimmed">Customer</Text><Text fw={500}>{viewOrder.customer || '-'}</Text></div>
              <div><Text size="sm" c="dimmed">Status</Text><Badge color={STATUS_COLORS[viewOrder.status]}>{viewOrder.status}</Badge></div>
              <div><Text size="sm" c="dimmed">Total Revenue</Text><Text fw={700} size="lg" c="green">{formatCurrency(viewOrder.total_revenue)}</Text></div>
            </SimpleGrid>
            {viewOrder.notes && <Text size="sm" c="dimmed">{viewOrder.notes}</Text>}
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Quantity</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Unit Price</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {viewOrder.items.map((item, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>{item.product_name}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{item.quantity}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price || '0')}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }} fw={500}>{formatCurrency(item.total_price || '0')}</Table.Td>
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
