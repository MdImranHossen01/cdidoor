import User from '@/models/User';

export async function upsertCustomer(
  clientName: string,
  clientPhone: string,
  clientAddress?: string,
  clientEmail?: string,
  clientDivision?: string,
  clientDistrict?: string,
  clientThana?: string,
  clientArea?: string
) {
  if (!clientPhone || !clientName) return;

  const phone = clientPhone.trim();
  const name = clientName.trim();
  const address = clientAddress ? clientAddress.trim() : '';
  const emailVal = clientEmail ? clientEmail.trim() : '';
  const divisionVal = clientDivision ? clientDivision.trim() : '';
  const districtVal = clientDistrict ? clientDistrict.trim() : '';
  const thanaVal = clientThana ? clientThana.trim() : '';
  const areaVal = clientArea ? clientArea.trim() : '';

  if (phone.length < 5) return;

  try {
    // Find user by phone
    let user = await User.findOne({ phone: phone });
    if (user) {
      let changed = false;
      if (user.name !== name) {
        user.name = name;
        changed = true;
      }
      
      // Update email if it was a placeholder and we now have a real email
      if (emailVal && (!user.email || user.email.includes(`@placeholder.${process.env.NEXT_PUBLIC_GUEST_EMAIL_DOMAIN || 'example-guest.com'}`))) {
        user.email = emailVal;
        changed = true;
      }

      // Update address fields
      if (address || divisionVal || districtVal || thanaVal || areaVal) {
        if (!user.addresses || user.addresses.length === 0) {
          user.addresses = [{
            street: address,
            division: divisionVal,
            district: districtVal,
            thana: thanaVal,
            area: areaVal,
            isDefault: true
          }];
          changed = true;
        } else {
          const defaultAddress = user.addresses.find((a: any) => a.isDefault) || user.addresses[0];
          let addrChanged = false;
          if (defaultAddress.street !== address) { defaultAddress.street = address; addrChanged = true; }
          if (defaultAddress.division !== divisionVal) { defaultAddress.division = divisionVal; addrChanged = true; }
          if (defaultAddress.district !== districtVal) { defaultAddress.district = districtVal; addrChanged = true; }
          if (defaultAddress.thana !== thanaVal) { defaultAddress.thana = thanaVal; addrChanged = true; }
          if (defaultAddress.area !== areaVal) { defaultAddress.area = areaVal; addrChanged = true; }

          if (addrChanged) {
            defaultAddress.isDefault = true;
            changed = true;
          }
        }
      }

      if (changed) {
        await user.save();
      }
    } else {
      let uniqueEmail: string | undefined = undefined;
      if (emailVal) {
        const emailExists = await User.findOne({ email: emailVal });
        uniqueEmail = emailExists ? `${phone}-${Date.now()}@placeholder.${process.env.NEXT_PUBLIC_GUEST_EMAIL_DOMAIN || 'example-guest.com'}` : emailVal;
      }

      const newUser = new User({
        name,
        phone,
        email: uniqueEmail,
        role: 'user',
        addresses: (address || divisionVal || districtVal || thanaVal || areaVal) ? [{
          street: address,
          division: divisionVal,
          district: districtVal,
          thana: thanaVal,
          area: areaVal,
          isDefault: true
        }] : []
      });
      await newUser.save();
    }
  } catch (error) {
    console.error('Error upserting customer during billing:', error);
  }
}
