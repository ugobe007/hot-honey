/**
 * Admin Configuration
 * Authorized administrators who can access admin panel
 */

export interface Admin {
  name: string;
  email: string;
  role: 'super-admin' | 'admin';
}

export const AUTHORIZED_ADMINS: Admin[] = [
  {
    name: 'Bob Christopher',
    email: 'ugobe07@gmail.com',
    role: 'super-admin'
  },
  {
    name: 'Andy Abramson',
    email: 'aabramson@comunicano.com',
    role: 'admin'
  },
  {
    name: 'Jonathan Parra',
    email: 'jonathan.parra@codingscape.com',
    role: 'admin'
  },
  {
    name: 'Darius Roberts',
    email: 'daruis.roberts@gmail.com',
    role: 'admin'
  }
];

/**
 * Check if email is authorized admin
 */
export const isAuthorizedAdmin = (email: string): boolean => {
  return AUTHORIZED_ADMINS.some(admin => 
    admin.email.toLowerCase() === email.toLowerCase()
  );
};

/**
 * Get admin by email
 */
export const getAdminByEmail = (email: string): Admin | undefined => {
  return AUTHORIZED_ADMINS.find(admin => 
    admin.email.toLowerCase() === email.toLowerCase()
  );
};
