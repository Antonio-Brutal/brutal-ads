import { z } from 'zod';
export declare const BrandKitData: z.ZodObject<{
    colors: z.ZodObject<{
        ink: z.ZodString;
        paper: z.ZodString;
        accent: z.ZodString;
        accent2: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        ink: string;
        paper: string;
        accent: string;
        accent2?: string | undefined;
    }, {
        ink: string;
        paper: string;
        accent: string;
        accent2?: string | undefined;
    }>;
    typography: z.ZodObject<{
        display: z.ZodString;
        body: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        display: string;
        body: string;
    }, {
        display: string;
        body: string;
    }>;
    logos: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        variant: z.ZodString;
        assetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        assetId: string;
        variant: string;
    }, {
        id: string;
        assetId: string;
        variant: string;
    }>, "many">>;
    iconography: z.ZodDefault<z.ZodObject<{
        style: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        style?: string | undefined;
    }, {
        style?: string | undefined;
    }>>;
    imagery: z.ZodDefault<z.ZodObject<{
        style: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        avoid: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    }, "strip", z.ZodTypeAny, {
        style?: string | undefined;
        avoid?: string[] | undefined;
    }, {
        style?: string | undefined;
        avoid?: string[] | undefined;
    }>>;
    voice: z.ZodString;
    bannedTerms: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    messaging: z.ZodDefault<z.ZodObject<{
        approvedClaims: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        approvedClaims: string[];
    }, {
        approvedClaims?: string[] | undefined;
    }>>;
    proofPoints: z.ZodDefault<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        spoken: z.ZodOptional<z.ZodObject<{
            de: z.ZodOptional<z.ZodString>;
            en: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            de?: string | undefined;
            en?: string | undefined;
        }, {
            de?: string | undefined;
            en?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        spoken?: {
            de?: string | undefined;
            en?: string | undefined;
        } | undefined;
    }, {
        label: string;
        spoken?: {
            de?: string | undefined;
            en?: string | undefined;
        } | undefined;
    }>, "many">>;
    requiredDisclaimers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    disclosures: z.ZodDefault<z.ZodObject<{
        aiContent: z.ZodDefault<z.ZodObject<{
            required: z.ZodDefault<z.ZodBoolean>;
            errorVerticals: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            required: boolean;
            errorVerticals: string[];
        }, {
            required?: boolean | undefined;
            errorVerticals?: string[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        aiContent: {
            required: boolean;
            errorVerticals: string[];
        };
    }, {
        aiContent?: {
            required?: boolean | undefined;
            errorVerticals?: string[] | undefined;
        } | undefined;
    }>>;
    localization: z.ZodDefault<z.ZodObject<{
        locales: z.ZodDefault<z.ZodArray<z.ZodEnum<["de", "en"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        locales: ("de" | "en")[];
    }, {
        locales?: ("de" | "en")[] | undefined;
    }>>;
    governance: z.ZodDefault<z.ZodObject<{
        version: z.ZodDefault<z.ZodNumber>;
        updatedBy: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version: number;
        updatedBy?: string | undefined;
    }, {
        version?: number | undefined;
        updatedBy?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    colors: {
        ink: string;
        paper: string;
        accent: string;
        accent2?: string | undefined;
    };
    typography: {
        display: string;
        body: string;
    };
    logos: {
        id: string;
        assetId: string;
        variant: string;
    }[];
    iconography: {
        style?: string | undefined;
    };
    imagery: {
        style?: string | undefined;
        avoid?: string[] | undefined;
    };
    voice: string;
    bannedTerms: string[];
    messaging: {
        approvedClaims: string[];
    };
    proofPoints: {
        label: string;
        spoken?: {
            de?: string | undefined;
            en?: string | undefined;
        } | undefined;
    }[];
    requiredDisclaimers: string[];
    disclosures: {
        aiContent: {
            required: boolean;
            errorVerticals: string[];
        };
    };
    localization: {
        locales: ("de" | "en")[];
    };
    governance: {
        version: number;
        updatedBy?: string | undefined;
    };
}, {
    colors: {
        ink: string;
        paper: string;
        accent: string;
        accent2?: string | undefined;
    };
    typography: {
        display: string;
        body: string;
    };
    voice: string;
    logos?: {
        id: string;
        assetId: string;
        variant: string;
    }[] | undefined;
    iconography?: {
        style?: string | undefined;
    } | undefined;
    imagery?: {
        style?: string | undefined;
        avoid?: string[] | undefined;
    } | undefined;
    bannedTerms?: string[] | undefined;
    messaging?: {
        approvedClaims?: string[] | undefined;
    } | undefined;
    proofPoints?: {
        label: string;
        spoken?: {
            de?: string | undefined;
            en?: string | undefined;
        } | undefined;
    }[] | undefined;
    requiredDisclaimers?: string[] | undefined;
    disclosures?: {
        aiContent?: {
            required?: boolean | undefined;
            errorVerticals?: string[] | undefined;
        } | undefined;
    } | undefined;
    localization?: {
        locales?: ("de" | "en")[] | undefined;
    } | undefined;
    governance?: {
        version?: number | undefined;
        updatedBy?: string | undefined;
    } | undefined;
}>;
export type BrandKitData = z.infer<typeof BrandKitData>;
