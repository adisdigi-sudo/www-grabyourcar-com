import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, Clock, MapPin, User, Phone, Mail, Car, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useCreateDriverBooking, RentalVehicle } from "@/hooks/useRentalServices";
import { useAuth } from "@/hooks/useAuth";

interface DriverBookingModalProps {
  vehicle: RentalVehicle | null;
  isOpen: boolean;
  onClose: () => void;
  serviceType: 'with_driver' | 'outstation';
}

const tripTypes = [
  { value: 'local', label: 'Local (Within City)', description: '8hrs/80km package' },
  { value: 'outstation_one_way', label: 'Outstation One Way', description: 'Drop to destination' },
  { value: 'outstation_round', label: 'Outstation Round Trip', description: 'Return journey included' },
  { value: 'airport', label: 'Airport Transfer', description: 'Pick/Drop to airport' },
];

export const DriverBookingModal = ({ vehicle, isOpen, onClose, serviceType }: DriverBookingModalProps) => {
  const { user } = useAuth();
  const createBooking = useCreateDriverBooking();
  
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    pickup_date: '',
    pickup_time: '',
    pickup_address: '',
    dropoff_address: '',
    trip_type: serviceType === 'outstation' ? 'outstation_round' : 'local',
    duration_days: 1,
    special_instructions: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.customer_name || !form.customer_phone || !form.pickup_date || !form.pickup_time || !form.pickup_address) {
      toast.error('Please fill all required fields');
      return;
    }

    const baseAmount = serviceType === 'outstation' 
      ? (vehicle?.rent_outstation_per_km || 12) * 200 * form.duration_days
      : (vehicle?.rent_with_driver || 1499) * form.duration_days;

    const driverCharges = form.duration_days > 1 ? 300 * form.duration_days : 0;
    const taxes = Math.round(baseAmount * 0.18);
    const totalAmount = baseAmount + driverCharges + taxes;

    try {
      await createBooking.mutateAsync({
        user_id: user?.id || null,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email || null,
        vehicle_id: vehicle?.id || null,
        vehicle_name: vehicle?.name || 'To be assigned',
        service_type: serviceType,
        pickup_date: form.pickup_date,
        pickup_time: form.pickup_time,
        pickup_address: form.pickup_address,
        dropoff_address: form.dropoff_address || null,
        trip_type: form.trip_type,
        duration_days: form.duration_days,
        base_amount: baseAmount,
        driver_charges: driverCharges,
        taxes: taxes,
        total_amount: totalAmount,
        status: 'pending',
        payment_status: 'pending',
        special_instructions: form.special_instructions || null,
        source: 'website',
      });

      toast.success('Booking request submitted! Our team will contact you shortly.');
      onClose();
      setForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        pickup_date: '',
        pickup_time: '',
        pickup_address: '',
        dropoff_address: '',
        trip_type: serviceType === 'outstation' ? 'outstation_round' : 'local',
        duration_days: 1,
        special_instructions: '',
      });
    } catch (error) {
      toast.error('Failed to submit booking. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            {serviceType === 'outstation' ? 'Book Outstation Trip' : 'Book with Driver'}
          </DialogTitle>
          <DialogDescription>
            {vehicle ? `${vehicle.name} - ${vehicle.brand}` : 'Professional chauffeur service'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Trip Type */}
          <div className="space-y-2">
            <Label>Trip Type</Label>
            <RadioGroup
              value={form.trip_type}
              onValueChange={(value) => setForm({ ...form, trip_type: value })}
              className="grid grid-cols-2 gap-2"
            >
              {tripTypes.filter(t => 
                serviceType === 'outstation' 
                  ? t.value.includes('outstation') 
                  : !t.value.includes('outstation')
              ).map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value} className="text-sm cursor-pointer">
                    <div>{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                <User className="h-3 w-3" /> Name *
              </Label>
              <Input
                placeholder="Your name"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone *
              </Label>
              <Input
                placeholder="Mobile number"
                value={form.customer_phone}
                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <Input
              type="email"
              placeholder="Email (optional)"
              value={form.customer_email}
              onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Pickup Date *
              </Label>
              <Input
                type="date"
                value={form.pickup_date}
                onChange={(e) => setForm({ ...form, pickup_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Pickup Time *
              </Label>
              <Input
                type="time"
                value={form.pickup_time}
                onChange={(e) => setForm({ ...form, pickup_time: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Duration for outstation */}
          {serviceType === 'outstation' && (
            <div className="space-y-1">
              <Label>Trip Duration (Days)</Label>
              <Select
                value={form.duration_days.toString()}
                onValueChange={(v) => setForm({ ...form, duration_days: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 10, 14].map((d) => (
                    <SelectItem key={d} value={d.toString()}>{d} {d === 1 ? 'Day' : 'Days'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Addresses */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Pickup Address *
            </Label>
            <Textarea
              placeholder="Enter complete pickup address"
              value={form.pickup_address}
              onChange={(e) => setForm({ ...form, pickup_address: e.target.value })}
              rows={2}
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Drop Address
            </Label>
            <Textarea
              placeholder="Enter drop address (if different)"
              value={form.dropoff_address}
              onChange={(e) => setForm({ ...form, dropoff_address: e.target.value })}
              rows={2}
            />
          </div>

          {/* Special Instructions */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> Special Instructions
            </Label>
            <Textarea
              placeholder="Any special requests..."
              value={form.special_instructions}
              onChange={(e) => setForm({ ...form, special_instructions: e.target.value })}
              rows={2}
            />
          </div>

          {/* Price Estimate */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Amount</span>
              <span>₹{((serviceType === 'outstation' ? (vehicle?.rent_outstation_per_km || 12) * 200 : (vehicle?.rent_with_driver || 1499)) * form.duration_days).toLocaleString()}</span>
            </div>
            {form.duration_days > 1 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Driver Allowance</span>
                <span>₹{(300 * form.duration_days).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxes (18%)</span>
              <span>₹{Math.round((serviceType === 'outstation' ? (vehicle?.rent_outstation_per_km || 12) * 200 : (vehicle?.rent_with_driver || 1499)) * form.duration_days * 0.18).toLocaleString()}</span>
            </div>
            <div className="border-t pt-1 flex justify-between font-bold">
              <span>Estimated Total</span>
              <span className="text-primary">
                ₹{(() => {
                  const base = (serviceType === 'outstation' ? (vehicle?.rent_outstation_per_km || 12) * 200 : (vehicle?.rent_with_driver || 1499)) * form.duration_days;
                  const driver = form.duration_days > 1 ? 300 * form.duration_days : 0;
                  const tax = Math.round(base * 0.18);
                  return (base + driver + tax).toLocaleString();
                })()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">*Toll, parking & extra km charges additional</p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="cta" disabled={createBooking.isPending}>
              {createBooking.isPending ? 'Submitting...' : 'Request Booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
