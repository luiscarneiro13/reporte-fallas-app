import { getNotificationTarget } from '../notifications';

describe('getNotificationTarget', () => {
  it('opens FaultDetail for fault_created even when url is present', () => {
    expect(getNotificationTarget({
      type: 'fault_created',
      fault_id: '42',
      url: 'https://servicioscasmar.com/equipment/7',
    })).toEqual({ name: 'FaultDetail', params: { faultId: '42' } });
  });

  it('falls back to EquipmentDetail for fault_closed (fault is archived)', () => {
    expect(getNotificationTarget({
      type: 'fault_closed',
      fault_id: '42',
      url: 'https://servicioscasmar.com/equipment/7',
    })).toEqual({ name: 'EquipmentDetail', params: { equipmentId: '7' } });
  });

  it('parses non-standard urls', () => {
    expect(getNotificationTarget({ url: 'casmar://equipment/9' }))
      .toEqual({ name: 'EquipmentDetail', params: { equipmentId: '9' } });
  });

  it('returns null when there is nothing to open', () => {
    expect(getNotificationTarget(undefined)).toBeNull();
    expect(getNotificationTarget({ type: 'fault_closed', fault_id: '1' })).toBeNull();
  });
});
