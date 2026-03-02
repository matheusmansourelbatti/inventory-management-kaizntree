import { useState } from 'react';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Anchor, Stack, Container, Alert } from '@mantine/core';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Container size={420} w="100%">
        <Title ta="center" className="text-blue-600" mb="sm">
          Inventory Manager
        </Title>
        <Text c="dimmed" size="sm" ta="center" mb={30}>
          Sign in to manage your inventory
        </Text>

        <Paper withBorder shadow="md" p={30} radius="md">
          <form onSubmit={handleSubmit}>
            <Stack>
              {error && <Alert color="red">{error}</Alert>}
              <TextInput
                label="Username"
                required
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
              />
              <PasswordInput
                label="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
              <Button type="submit" fullWidth loading={loading}>
                Sign in
              </Button>
            </Stack>
          </form>

          <Text c="dimmed" size="sm" ta="center" mt="md">
            Don't have an account?{' '}
            <Anchor component={Link} to="/register" size="sm">
              Register
            </Anchor>
          </Text>
        </Paper>
      </Container>
    </div>
  );
}
