import { useQuery } from '@tanstack/react-query';
import { Paper, Title, SimpleGrid, Text, Group, Loader, Table, Badge, Stack, Card, ThemeIcon, Tooltip } from '@mantine/core';
import { IconCurrencyDollar, IconTrendingUp, IconPackage, IconReceipt, IconTruckDelivery, IconPercentage } from '@tabler/icons-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend } from 'recharts';
import { financialApi } from '../api/financial';
import { formatCurrency, formatNumber, UNIT_LABELS } from '../utils/format';

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['financial-summary'],
    queryFn: financialApi.getSummary,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader /></div>;
  if (!data) return null;

  const statsCards = [
    { title: 'Total Revenue', value: formatCurrency(data.total_revenue), icon: IconCurrencyDollar, color: 'green' },
    { title: 'Total Costs', value: formatCurrency(data.total_costs), icon: IconTruckDelivery, color: 'red' },
    { title: 'Total Profit', value: formatCurrency(data.total_profit), icon: IconTrendingUp, color: parseFloat(data.total_profit) >= 0 ? 'teal' : 'red' },
    { title: 'Profit Margin', value: data.profit_margin ? `${formatNumber(data.profit_margin)}%` : 'N/A', icon: IconPercentage, color: 'blue' },
  ];

  const countsCards = [
    { title: 'Products', value: data.total_products, icon: IconPackage, color: 'violet' },
    { title: 'Purchase Orders', value: data.total_purchase_orders, icon: IconTruckDelivery, color: 'orange' },
    { title: 'Sales Orders', value: data.total_sales_orders, icon: IconReceipt, color: 'cyan' },
  ];

  const chartData = data.products
    .filter((p) => parseFloat(p.total_revenue) > 0 || parseFloat(p.total_purchased_cost) > 0)
    .map((p) => ({
      name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
      Revenue: parseFloat(p.total_revenue),
      Cost: parseFloat(p.total_purchased_cost),
      Profit: parseFloat(p.profit),
    }));

  return (
    <Stack gap="lg">
      <Title order={2}>Financial Dashboard</Title>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
        {statsCards.map((s) => (
          <Card key={s.title} withBorder shadow="sm" radius="md" padding="lg">
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={500}>{s.title}</Text>
              <ThemeIcon variant="light" color={s.color} size="lg" radius="md">
                <s.icon size={20} />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="xl">{s.value}</Text>
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, xs: 3 }}>
        {countsCards.map((s) => (
          <Card key={s.title} withBorder shadow="sm" radius="md" padding="lg">
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={500}>{s.title}</Text>
              <ThemeIcon variant="light" color={s.color} size="lg" radius="md">
                <s.icon size={20} />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="xl">{s.value}</Text>
          </Card>
        ))}
      </SimpleGrid>

      {/* Chart */}
      {chartData.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Title order={4} mb="md">Revenue vs Cost by Product</Title>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => `$${v}`} />
              <ReTooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="Revenue" fill="#40c057" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Cost" fill="#fa5252" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Profit" fill="#228be6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Product-level breakdown table */}
      <Paper withBorder p="md" radius="md">
        <Title order={4} mb="md">Product Financial Breakdown</Title>
        {data.products.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">No products yet. Create products to see financial data.</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Product</Table.Th>
                <Table.Th>SKU</Table.Th>
                <Table.Th>Unit</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Stock</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Purchased</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Sold</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Total Cost</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Revenue</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Profit</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Margin</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.products.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td fw={500}>{p.name}</Table.Td>
                  <Table.Td><Badge variant="light" size="sm">{p.sku}</Badge></Table.Td>
                  <Table.Td>{UNIT_LABELS[p.unit]}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>{formatNumber(p.current_stock, 1)}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>{formatNumber(p.total_purchased_quantity, 1)}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>{formatNumber(p.total_sold_quantity, 1)}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>{formatCurrency(p.total_purchased_cost)}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>{formatCurrency(p.total_revenue)}</Table.Td>
                  <Table.Td style={{ textAlign: 'right', color: parseFloat(p.profit) >= 0 ? '#40c057' : '#fa5252', fontWeight: 600 }}>
                    {formatCurrency(p.profit)}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {p.profit_margin != null ? (
                      <Badge color={parseFloat(p.profit_margin) >= 0 ? 'green' : 'red'}>
                        {formatNumber(p.profit_margin)}%
                      </Badge>
                    ) : (
                      <Text c="dimmed" size="sm">N/A</Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}
