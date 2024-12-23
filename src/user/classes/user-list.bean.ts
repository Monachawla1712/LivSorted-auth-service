export class UserListBean {
  id: string = null;
  greeting: string = null;
  name: string = null;
  country_code: string = null;

  phone_number: string = null;

  email: string = null;
  avatar_url: string = null;

  address: AddressListBean = new AddressListBean();
}

export class AddressListBean {
  id: bigint = null;
  name: string = null;
  type: string = null;
  lat?: number = null;
  long?: number = null;
  address_line_1: string = null;
  address_line_2: string = null;
  landmark: string = null;
  city: string = null;
  state: string = null;
  pincode: number = null;
  contact_number: string = null;
  floor: string = null;
  house: string = null;
  street: string = null;
  society: string = null;
  sector: string = null;
}
