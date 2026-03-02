import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Title, Button, Group, TextInput, Select, Textarea, Modal, Table, Badge,
  ActionIcon, Stack, Paper, Text, NumberInput, Card, SimpleGrid, Loader, Menu, Tabs,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconEdit, IconTrash, IconSearch, IconDotsVertical,
  IconPackage, IconCurrencyDollar, IconHistory,
} from '@tabler/icons-react';
import { productsApi } from '../api/products';
import { formatCurrency, formatNumber, formatDateTime, UNIT_LABELS } from '../utils/format';
import type { Product, ProductListItem } from '../types';

const UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'L', label: 'Liters (L)' },
  { value: 'mL', label: 'Milliliters (mL)' },
  { value: 'unit', label: 'Units' },
];

export function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(null);
  const [detailProduct, setDetailProduct] = useState<string | null>(null);
  const [stockModal, setStockModal] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState<string>('unit');
  const [stockQty, setStockQty] = useState<number | string>(0);
  const [stockNote, setStockNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => productsApi.list(search || undefined),
  });

  const { data: productDetail } = useQuery({
    queryKey: ['product', detailProduct],
    queryFn: () => productsApi.get(detailProduct!),
    enabled: !!detailProduct,
  });

  const { data: stockHistory } = useQuery({
    queryKey: ['stocks', detailProduct],
    queryFn: () => productsApi.getStocks(detailProduct!),
    enabled: !!detailProduct,
  });

  const createMutation = useMutation({
    mutationFn: (p: Partial<Product>) => productsApi.create(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      closeCreate();
      resetForm();
      notifications.show({ title: 'Success', message: 'Product created', color: 'green' });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.sku?.[0] || 'Failed to create product', color: 'red' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => productsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
      resetForm();
      notifications.show({ title: 'Success', message: 'Product updated', color: 'green' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      notifications.show({ title: 'Success', message: 'Product deleted', color: 'green' });
    },
  });

  const addStockMutation = useMutation({
    mutationFn: ({ productId, quantity, note }: any) => productsApi.addStock(productId, quantity, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product'] });
      qc.invalidateQueries({ queryKey: ['stocks'] });
      setStockModal(null);
      setStockQty(0);
      setStockNote('');
      notifications.show({ title: 'Success', message: 'Stock added', color: 'green' });
    },
  });

  const resetForm = () => {
    setName(''); setDescription(''); setSku(''); setUnit('unit');
  };

  const openEdit = (p: ProductListItem) => {
    setEditingProduct(p);
    setName(p.name); setDescription(p.description); setSku(p.sku); setUnit(p.unit);
  };

  const handleCreate = () => {
    createMutation.mutate({ name, description, sku, unit: unit as any });
  };

  const handleUpdate = () => {
    if (!editingProduct) return;
    updateMutation.mutate({ id: editingProduct.id, name, description, sku, unit });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader /></div>;

  const products = data?.results || [];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Products</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Add Product
        </Button>
      </Group>

      <TextInput
        placeholder="Search products..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
      />

      {products.length === 0 ? (
        <Paper withBorder p="xl" ta="center">
          <IconPackage size={48} className="mx-auto mb-2 text-gray-400" />
          <Text c="dimmed">No products found. Create your first product to get started.</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>SKU</Table.Th>
                <Table.Th>Unit</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Stock</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {products.map((p) => (
                <Table.Tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setDetailProduct(p.id)}>
                  <Table.Td fw={500}>{p.name}</Table.Td>
                  <Table.Td><Badge variant="light" size="sm">{p.sku}</Badge></Table.Td>
                  <Table.Td>{UNIT_LABELS[p.unit]}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>{formatNumber(p.current_stock, 1)}</Table.Td>
                  <Table.Td>{formatDateTime(p.created_at)}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <Menu shadow="md">
                      <Menu.Target>
                        <ActionIcon variant="subtle"><IconDotsVertical size={16} /></ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconPlus size={14} />} onClick={() => setStockModal(p.id)}>Add Stock</Menu.Item>
                        <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => openEdit(p)}>Edit</Menu.Item>
                        <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => deleteMutation.mutate(p.id)}>Delete</Menu.Item>
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
      <Modal opened={createOpened} onClose={closeCreate} title="Create Product" size="md">
        <Stack>
          <TextInput label="Name" required value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <TextInput label="SKU / Code" required value={sku} onChange={(e) => setSku(e.currentTarget.value)} />
          <Select label="Unit" data={UNIT_OPTIONS} value={unit} onChange={(v) => setUnit(v || 'unit')} />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
          <Button onClick={handleCreate} loading={createMutation.isPending}>Create</Button>
        </Stack>
      </Modal>

      {/* Edit Modal */}
      <Modal opened={!!editingProduct} onClose={() => { setEditingProduct(null); resetForm(); }} title="Edit Product" size="md">
        <Stack>
          <TextInput label="Name" required value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <TextInput label="SKU / Code" required value={sku} onChange={(e) => setSku(e.currentTarget.value)} />
          <Select label="Unit" data={UNIT_OPTIONS} value={unit} onChange={(v) => setUnit(v || 'unit')} />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
          <Button onClick={handleUpdate} loading={updateMutation.isPending}>Save Changes</Button>
        </Stack>
      </Modal>

      {/* Add Stock Modal */}
      <Modal opened={!!stockModal} onClose={() => setStockModal(null)} title="Add Stock Manually" size="sm">
        <Stack>
          <NumberInput label="Quantity" required min={0.001} decimalScale={3} value={stockQty} onChange={setStockQty} />
          <TextInput label="Note (optional)" value={stockNote} onChange={(e) => setStockNote(e.currentTarget.value)} />
          <Button onClick={() => addStockMutation.mutate({ productId: stockModal, quantity: String(stockQty), note: stockNote })} loading={addStockMutation.isPending}>
            Add Stock
          </Button>
        </Stack>
      </Modal>

      {/* Detail Modal */}
      <Modal opened={!!detailProduct} onClose={() => setDetailProduct(null)} title="Product Details" size="xl">
        {productDetail && (
          <Tabs defaultValue="overview">
            <Tabs.List>
              <Tabs.Tab value="overview" leftSection={<IconPackage size={14} />}>Overview</Tabs.Tab>
              <Tabs.Tab value="financials" leftSection={<IconCurrencyDollar size={14} />}>Financials</Tabs.Tab>
              <Tabs.Tab value="stock-history" leftSection={<IconHistory size={14} />}>Stock History</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              <SimpleGrid cols={2}>
                <div><Text size="sm" c="dimmed">Name</Text><Text fw={500}>{productDetail.name}</Text></div>
                <div><Text size="sm" c="dimmed">SKU</Text><Text fw={500}>{productDetail.sku}</Text></div>
                <div><Text size="sm" c="dimmed">Unit</Text><Text fw={500}>{UNIT_LABELS[productDetail.unit]}</Text></div>
                <div><Text size="sm" c="dimmed">Current Stock</Text><Text fw={500}>{formatNumber(productDetail.current_stock, 1)} {UNIT_LABELS[productDetail.unit]}</Text></div>
              </SimpleGrid>
              {productDetail.description && <Text mt="md" c="dimmed">{productDetail.description}</Text>}
            </Tabs.Panel>

            <Tabs.Panel value="financials" pt="md">
              <SimpleGrid cols={2}>
                <Card withBorder p="md">
                  <Text size="sm" c="dimmed">Total Purchased</Text>
                  <Text fw={700} size="lg">{formatCurrency(productDetail.total_purchased_cost)}</Text>
                  <Text size="xs" c="dimmed">{formatNumber(productDetail.total_purchased_quantity, 1)} {UNIT_LABELS[productDetail.unit]}</Text>
                </Card>
                <Card withBorder p="md">
                  <Text size="sm" c="dimmed">Total Revenue</Text>
                  <Text fw={700} size="lg" c="green">{formatCurrency(productDetail.total_revenue)}</Text>
                  <Text size="xs" c="dimmed">{formatNumber(productDetail.total_sold_quantity, 1)} {UNIT_LABELS[productDetail.unit]} sold</Text>
                </Card>
                <Card withBorder p="md">
                  <Text size="sm" c="dimmed">Profit</Text>
                  <Text fw={700} size="lg" c={parseFloat(productDetail.profit) >= 0 ? 'teal' : 'red'}>
                    {formatCurrency(productDetail.profit)}
                  </Text>
                </Card>
                <Card withBorder p="md">
                  <Text size="sm" c="dimmed">Profit Margin</Text>
                  <Text fw={700} size="lg">
                    {productDetail.profit_margin != null ? `${formatNumber(productDetail.profit_margin)}%` : 'N/A'}
                  </Text>
                </Card>
              </SimpleGrid>
            </Tabs.Panel>

            <Tabs.Panel value="stock-history" pt="md">
              {stockHistory && stockHistory.results.length > 0 ? (
                <Table striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Quantity</Table.Th>
                      <Table.Th>Source</Table.Th>
                      <Table.Th>Note</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {stockHistory.results.map((s) => (
                      <Table.Tr key={s.id}>
                        <Table.Td>{formatDateTime(s.created_at)}</Table.Td>
                        <Table.Td>
                          <Text c={parseFloat(s.quantity) >= 0 ? 'green' : 'red'} fw={500}>
                            {parseFloat(s.quantity) >= 0 ? '+' : ''}{formatNumber(s.quantity, 1)}
                          </Text>
                        </Table.Td>
                        <Table.Td><Badge variant="light">{s.source}</Badge></Table.Td>
                        <Table.Td>{s.note}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              ) : (
                <Text c="dimmed" ta="center" py="xl">No stock history yet.</Text>
              )}
            </Tabs.Panel>
          </Tabs>
        )}
      </Modal>
    </Stack>
  );
}
