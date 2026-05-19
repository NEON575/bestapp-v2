import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const permissions = [
  { key: 'dashboard.view', name: 'View dashboard' },
  { key: 'orders.read', name: 'Read orders' },
  { key: 'orders.write', name: 'Write orders' },
  { key: 'customers.read', name: 'Read customers' },
  { key: 'customers.write', name: 'Write customers' },
  { key: 'inventory.read', name: 'Read inventory' },
  { key: 'inventory.write', name: 'Write inventory' },
  { key: 'finance.read', name: 'Read finance' },
  { key: 'finance.write', name: 'Write finance' },
  { key: 'production.read', name: 'Read production' },
  { key: 'production.write', name: 'Write production' },
  { key: 'audit.read', name: 'Read audit logs' },
  { key: 'users.manage', name: 'Manage users' },
  { key: 'roles.manage', name: 'Manage roles' }
];

async function main() {
  const permissionRows = await Promise.all(
    permissions.map((permission) =>
      prisma.permission.upsert({
        where: { key: permission.key },
        update: { name: permission.name },
        create: permission
      })
    )
  );

  const roles = [
    { key: 'super_admin', name: 'Super Admin' },
    { key: 'owner', name: 'Owner' },
    { key: 'manager', name: 'Manager' },
    { key: 'accountant', name: 'Accountant' },
    { key: 'warehouse', name: 'Warehouse' },
    { key: 'production', name: 'Production' }
  ];

  const roleRows = await Promise.all(
    roles.map((role) =>
      prisma.role.upsert({
        where: { key: role.key },
        update: { name: role.name },
        create: role
      })
    )
  );

  const superAdmin = roleRows.find((role) => role.key === 'super_admin');
  if (superAdmin) {
    for (const permission of permissionRows) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdmin.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: superAdmin.id,
          permissionId: permission.id
        }
      });
    }
  }

  const managerRole = roleRows.find((role) => role.key === 'manager');
  const accountantRole = roleRows.find((role) => role.key === 'accountant');
  const warehouseRole = roleRows.find((role) => role.key === 'warehouse');
  const productionRole = roleRows.find((role) => role.key === 'production');
  const ownerRole = roleRows.find((role) => role.key === 'owner');

  const rolePermissionMap: Record<string, string[]> = {
    owner: ['dashboard.view', 'orders.read', 'orders.write', 'customers.read', 'customers.write', 'inventory.read', 'finance.read', 'production.read', 'audit.read'],
    manager: ['dashboard.view', 'orders.read', 'orders.write', 'customers.read', 'customers.write', 'production.read'],
    accountant: ['dashboard.view', 'finance.read', 'finance.write', 'audit.read'],
    warehouse: ['dashboard.view', 'inventory.read', 'inventory.write'],
    production: ['dashboard.view', 'production.read', 'production.write', 'inventory.read']
  };

  for (const [roleKey, permissionKeys] of Object.entries(rolePermissionMap)) {
    const role = roleRows.find((item) => item.key === roleKey);
    if (!role) continue;
    for (const permissionKey of permissionKeys) {
      const permission = permissionRows.find((item) => item.key === permissionKey);
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }

  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bestapp.local' },
    update: {
      fullName: 'System Admin',
      passwordHash,
      isActive: true
    },
    create: {
      email: 'admin@bestapp.local',
      fullName: 'System Admin',
      passwordHash,
      isActive: true
    }
  });

  if (superAdmin) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: superAdmin.id
        }
      },
      update: {},
      create: {
        userId: admin.id,
        roleId: superAdmin.id
      }
    });
  }

  // keep variables referenced so ts doesn't complain in some toolchains
  void managerRole;
  void accountantRole;
  void warehouseRole;
  void productionRole;
  void ownerRole;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

