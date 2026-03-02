import { AppShell, NavLink, Group, Title, ActionIcon, Text, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDashboard,
  IconPackage,
  IconTruckDelivery,
  IconReceipt,
  IconLogout,
  IconUser,
} from '@tabler/icons-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: IconDashboard, path: '/' },
  { label: 'Products', icon: IconPackage, path: '/products' },
  { label: 'Purchase Orders', icon: IconTruckDelivery, path: '/purchase-orders' },
  { label: 'Sales Orders', icon: IconReceipt, path: '/sales-orders' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [opened, { toggle, close }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3} className="text-blue-600">
              Inventory Manager
            </Title>
          </Group>
          <Group gap="sm">
            <IconUser size={18} />
            <Text size="sm" fw={500}>{user?.username}</Text>
            <ActionIcon variant="subtle" color="red" onClick={logout} title="Logout">
              <IconLogout size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            label={item.label}
            leftSection={<item.icon size={20} />}
            active={location.pathname === item.path}
            onClick={() => { navigate(item.path); close(); }}
            variant="filled"
            mb={4}
            style={{ borderRadius: 8 }}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
