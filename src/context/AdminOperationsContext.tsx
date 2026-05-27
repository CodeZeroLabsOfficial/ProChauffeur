"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  assignFleetVehicle,
  createFleetLocation,
  deleteDriverFleetDocuments,
  deleteFleetLocation,
  listenCompanyProfile,
  listenFleetLocations,
  listenFleetVehicles,
  listenGlobalLimits,
  listenFleetLocale,
  listenOperatingHours,
  listenPricingConfig,
  saveCompanyProfile,
  saveFleetLocale,
  saveFleetOperatingHours,
  savePricingConfig,
  unassignFleetVehicleFromChauffeur,
  updateFleetLocation,
  updateUserDriverProfile,
  updateUserProfile,
  upsertVehicle,
} from "@/lib/prochauffeur/firestore";
import type {
  AppFleetLocaleSettings,
  AppFleetOperatingHours,
  AppGlobalLimits,
  CompanyProfile,
  DriverProfile,
  FleetLocation,
  PricingConfig,
  UserProfile,
  Vehicle,
} from "@/lib/prochauffeur/types";
import {
  DEFAULT_PRICING_CONFIG,
  EMPTY_FLEET_LOCALE,
} from "@/lib/prochauffeur/types";

type AdminOperationsContextValue = {
  vehicles: Vehicle[];
  locations: FleetLocation[];
  limits: AppGlobalLimits;
  operatingHours: AppFleetOperatingHours;
  fleetLocale: AppFleetLocaleSettings;
  companyProfile: CompanyProfile;
  pricingConfig: PricingConfig;
  hasPricingDocument: boolean;
  hasReceivedOperationsSnapshot: boolean;
  actionError: string | null;
  isSaving: boolean;
  clearActionError: () => void;
  saveVehicle: (vehicle: Vehicle) => Promise<boolean>;
  assignVehicle: (
    vehicleDocumentId: string,
    chauffeurUserId: string
  ) => Promise<boolean>;
  unassignVehicle: (chauffeurUserId: string) => Promise<boolean>;
  createLocation: (input: {
    name: string;
    addressLine: string;
  }) => Promise<string | null>;
  saveLocation: (location: FleetLocation) => Promise<boolean>;
  removeLocation: (id: string) => Promise<boolean>;
  saveOperatingHours: (hours: AppFleetOperatingHours) => Promise<boolean>;
  saveFleetLocale: (locale: AppFleetLocaleSettings) => Promise<boolean>;
  saveCompany: (profile: CompanyProfile) => Promise<boolean>;
  savePricing: (config: PricingConfig) => Promise<boolean>;
  saveDriverProfiles: (
    uid: string,
    profile: UserProfile,
    driverProfile: DriverProfile
  ) => Promise<boolean>;
  deleteDriver: (uid: string) => Promise<boolean>;
  vehicleForChauffeur: (chauffeurUserId: string) => Vehicle | undefined;
};

const AdminOperationsContext =
  createContext<AdminOperationsContextValue | null>(null);

export function AdminOperationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locations, setLocations] = useState<FleetLocation[]>([]);
  const [limits, setLimits] = useState<AppGlobalLimits | null>(null);
  const [operatingHours, setOperatingHours] =
    useState<AppFleetOperatingHours | null>(null);
  const [fleetLocale, setFleetLocale] = useState<AppFleetLocaleSettings | null>(
    null
  );
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null
  );
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(
    null
  );
  const [hasPricingDocument, setHasPricingDocument] = useState(false);
  const [hasReceivedOperationsSnapshot, setHasReceivedOperationsSnapshot] =
    useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let readyCount = 0;
    const markReady = () => {
      readyCount += 1;
      if (readyCount >= 7) {
        setHasReceivedOperationsSnapshot(true);
      }
    };

    const unsubVehicles = listenFleetVehicles((rows) => {
      setVehicles(rows);
      markReady();
    });
    const unsubLocations = listenFleetLocations((rows) => {
      setLocations(rows);
      markReady();
    });
    const unsubLimits = listenGlobalLimits((rows) => {
      setLimits(rows);
      markReady();
    });
    const unsubHours = listenOperatingHours((rows) => {
      setOperatingHours(rows);
      markReady();
    });
    const unsubLocale = listenFleetLocale((rows) => {
      setFleetLocale(rows);
      markReady();
    });
    const unsubCompany = listenCompanyProfile((rows) => {
      setCompanyProfile(rows);
      markReady();
    });
    const unsubPricing = listenPricingConfig((config, exists) => {
      setPricingConfig(config);
      setHasPricingDocument(exists);
      markReady();
    });

    return () => {
      unsubVehicles();
      unsubLocations();
      unsubLimits();
      unsubHours();
      unsubLocale();
      unsubCompany();
      unsubPricing();
    };
  }, []);

  const runMutation = useCallback(
    async (fn: () => Promise<void>): Promise<boolean> => {
      setActionError(null);
      setIsSaving(true);
      try {
        await fn();
        return true;
      } catch (e) {
        setActionError(
          e instanceof Error ? e.message : "Something went wrong."
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const vehicleForChauffeur = useCallback(
    (chauffeurUserId: string) => {
      return vehicles.find((vehicle) => {
        if (vehicle.assignedChauffeurUserId === "") return false;
        const effective =
          vehicle.assignedChauffeurUserId ?? vehicle.driverID;
        return effective === chauffeurUserId;
      });
    },
    [vehicles]
  );

  const value = useMemo<AdminOperationsContextValue>(
    () => ({
      vehicles,
      locations,
      limits: limits ?? {
        maxAdmins: Number.MAX_SAFE_INTEGER,
        maxDrivers: Number.MAX_SAFE_INTEGER,
        maxLocations: Number.MAX_SAFE_INTEGER,
        subscriptionTier: "",
      },
      operatingHours: operatingHours ?? {
        timeZoneIdentifier: null,
        weekStartsOn: 2,
        schedules: [],
      },
      fleetLocale: fleetLocale ?? EMPTY_FLEET_LOCALE,
      companyProfile: companyProfile ?? {
        displayName: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        abn: "",
        acn: "",
        logoURL: "",
      },
      pricingConfig: pricingConfig ?? DEFAULT_PRICING_CONFIG,
      hasPricingDocument,
      hasReceivedOperationsSnapshot,
      actionError,
      isSaving,
      clearActionError: () => setActionError(null),
      saveVehicle: (vehicle) => runMutation(() => upsertVehicle(vehicle)),
      assignVehicle: (vehicleDocumentId, chauffeurUserId) =>
        runMutation(() =>
          assignFleetVehicle(vehicles, vehicleDocumentId, chauffeurUserId)
        ),
      unassignVehicle: (chauffeurUserId) =>
        runMutation(() =>
          unassignFleetVehicleFromChauffeur(vehicles, chauffeurUserId)
        ),
      createLocation: async (input) => {
        setActionError(null);
        setIsSaving(true);
        try {
          const id = await createFleetLocation(input);
          return id;
        } catch (e) {
          setActionError(
            e instanceof Error ? e.message : "Could not create location."
          );
          return null;
        } finally {
          setIsSaving(false);
        }
      },
      saveLocation: (location) =>
        runMutation(() => updateFleetLocation(location)),
      removeLocation: (id) => runMutation(() => deleteFleetLocation(id)),
      saveOperatingHours: (hours) =>
        runMutation(() => saveFleetOperatingHours(hours)),
      saveFleetLocale: (locale) =>
        runMutation(() =>
          saveFleetLocale(
            locale,
            operatingHours ?? {
              timeZoneIdentifier: null,
              weekStartsOn: 2,
              schedules: [],
            }
          )
        ),
      saveCompany: (profile) => runMutation(() => saveCompanyProfile(profile)),
      savePricing: (config) => runMutation(() => savePricingConfig(config)),
      saveDriverProfiles: (uid, profile, driverProfile) =>
        runMutation(async () => {
          await updateUserProfile(uid, profile);
          await updateUserDriverProfile(uid, driverProfile);
        }),
      deleteDriver: (uid) => runMutation(() => deleteDriverFleetDocuments(uid)),
      vehicleForChauffeur,
    }),
    [
      actionError,
      companyProfile,
      hasPricingDocument,
      hasReceivedOperationsSnapshot,
      isSaving,
      fleetLocale,
      limits,
      locations,
      operatingHours,
      pricingConfig,
      runMutation,
      vehicleForChauffeur,
      vehicles,
    ]
  );

  return (
    <AdminOperationsContext.Provider value={value}>
      {children}
    </AdminOperationsContext.Provider>
  );
}

export function useAdminOperations(): AdminOperationsContextValue {
  const ctx = useContext(AdminOperationsContext);
  if (!ctx) {
    throw new Error(
      "useAdminOperations must be used within AdminOperationsProvider"
    );
  }
  return ctx;
}
